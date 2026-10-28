// SPDX-License-Identifier: Apache-2.0
// Maintainer-only external observer. Never bundled with the product.
import AppKit
import ApplicationServices
import Foundation

func fail(_ text: String) -> Never {FileHandle.standardError.write(Data((text+"\n").utf8));exit(1)}
func emit(_ value: Any) {do {let d=try JSONSerialization.data(withJSONObject:value,options:[.sortedKeys]);FileHandle.standardOutput.write(d);FileHandle.standardOutput.write(Data([10]))}catch{fail("JSON: \(error)")}}
func attribute(_ element: AXUIElement,_ name:String)->CFTypeRef? {var value:CFTypeRef?;let status=AXUIElementCopyAttributeValue(element,name as CFString,&value);return status == .success ? value:nil}
let args=Array(CommandLine.arguments.dropFirst())
guard let operation=args.first else {fail("Supply an operation")}
if operation == "preflight" {emit(["accessibility":AXIsProcessTrusted(),"screenCapture":CGPreflightScreenCaptureAccess()]);exit(0)}
if operation == "launch" {
    guard args.count>=2 else{fail("Supply app")}
    let config=NSWorkspace.OpenConfiguration();config.createsNewApplicationInstance=true;config.activates=true;config.arguments=Array(args.dropFirst(2));config.environment=["PATH":"/usr/bin:/bin:/usr/sbin:/sbin","HOME":NSHomeDirectory()]
    var finished=false
    NSWorkspace.shared.openApplication(at:URL(fileURLWithPath:args[1]),configuration:config){ app,error in
        if let error=error{fail("LaunchServices: \(error)")}
        guard let app=app else{fail("No running app")}
        emit(["pid":Int(app.processIdentifier),"bundle":app.bundleURL?.path ?? "","executable":app.executableURL?.path ?? ""]);finished=true
    }
    let deadline=Date().addingTimeInterval(25);while !finished && Date()<deadline{RunLoop.current.run(until:Date().addingTimeInterval(0.05))};if !finished{fail("LaunchServices deadline")};exit(0)
}
guard args.count>=2,let pid=Int32(args[1]),let app=NSRunningApplication(processIdentifier:pid) else{fail("Missing owned PID")}
if operation == "close" {guard app.terminate() else{fail("Termination rejected")};emit(["terminated":true]);exit(0)}
guard AXIsProcessTrusted() else{fail("External observer lacks isolated-runner Accessibility permission")}
let application=AXUIElementCreateApplication(pid);AXUIElementSetMessagingTimeout(application,0.2)
AXUIElementSetAttributeValue(application,"AXEnhancedUserInterface" as CFString,kCFBooleanTrue)
AXUIElementSetAttributeValue(application,"AXManualAccessibility" as CFString,kCFBooleanTrue)
var queue:[(AXUIElement,Int)]=[(application,0)],records:[[String:Any]]=[],found:AXUIElement?=nil
let wanted=args.count>2 ? args[2]:"";var visited=Set<CFHashCode>();let deadline=Date().addingTimeInterval(8)
while !queue.isEmpty && records.count<2500 && Date()<deadline {
    let (element,depth)=queue.removeFirst();let key=CFHash(element);if visited.contains(key){continue};visited.insert(key);AXUIElementSetMessagingTimeout(element,0.1)
    let title=attribute(element,"AXTitle") as? String ?? "",desc=attribute(element,"AXDescription") as? String ?? "",value=attribute(element,"AXValue") as? String ?? "",role=attribute(element,"AXRole") as? String ?? ""
    let name=title.isEmpty ? desc:title;records.append(["name":name,"title":title,"description":desc,"value":value,"role":role,"depth":depth])
    if !wanted.isEmpty && (name==wanted || desc==wanted || title==wanted){found=element}
    if depth<35,let children=attribute(element,"AXChildren") as? [AXUIElement]{queue.append(contentsOf:children.map{($0,depth+1)})}
}
if operation == "press" {guard let found=found else{emit(["records":records,"missing":wanted]);exit(2)};let status=AXUIElementPerformAction(found,kAXPressAction as CFString);if status != .success{fail("AXPress failed \(status.rawValue)")};emit(["pressed":wanted]);exit(0)}
var result:[String:Any]=["pid":Int(pid),"bundle":app.bundleURL?.path ?? "","executable":app.executableURL?.path ?? "","records":records,"overflow":!queue.isEmpty]
if operation == "screenshot" {
    guard args.count>2 else{fail("Supply screenshot output")}
    guard let list=CGWindowListCopyWindowInfo([.optionOnScreenOnly,.excludeDesktopElements],kCGNullWindowID) as? [[String:Any]],let window=list.first(where:{($0[kCGWindowOwnerPID as String] as? Int)==Int(pid)&&($0[kCGWindowLayer as String] as? Int)==0}),let number=window[kCGWindowNumber as String] as? Int else{fail("No native app window")}
    let process=Process();process.executableURL=URL(fileURLWithPath:"/usr/sbin/screencapture");process.arguments=["-x","-l",String(number),args[2]];process.standardInput=FileHandle.nullDevice;do{try process.run();process.waitUntilExit()}catch{fail("Capture: \(error)")};guard process.terminationStatus==0,let data=try? Data(contentsOf:URL(fileURLWithPath:args[2])),let image=NSBitmapImageRep(data:data) else{fail("Window capture failed")}
    var red=0,green=0
    for y in 0..<image.pixelsHigh {for x in 0..<image.pixelsWide {if let c=image.colorAt(x:x,y:y)?.usingColorSpace(.deviceRGB){if c.redComponent>0.65 && c.greenComponent<0.25 && c.blueComponent<0.25{red+=1};if c.greenComponent>0.6 && c.redComponent<0.3 && c.blueComponent<0.3{green+=1}}}}
    result["window"]=number;result["pixels"]=["red":red,"green":green,"width":image.pixelsWide,"height":image.pixelsHigh]
}
emit(result)
