// SPDX-License-Identifier: Apache-2.0
// Maintainer-only external observer. Never bundled with the product.
import AppKit
import ApplicationServices
import Foundation
import Darwin
import CryptoKit

func fail(_ text: String) -> Never {FileHandle.standardError.write(Data((text+"\n").utf8));exit(1)}
func emit(_ value: Any) {do {let d=try JSONSerialization.data(withJSONObject:value,options:[.sortedKeys]);FileHandle.standardOutput.write(d);FileHandle.standardOutput.write(Data([10]))}catch{fail("JSON: \(error)")}}
func attribute(_ element: AXUIElement,_ name:String)->CFTypeRef? {var value:CFTypeRef?;let status=AXUIElementCopyAttributeValue(element,name as CFString,&value);return status == .success ? value:nil}
let args=Array(CommandLine.arguments.dropFirst())
guard let operation=args.first else {fail("Supply an operation")}
// The isolated maintainer observer interrupts a real Installer-owned coordinator.
// No fault-injection hook or altered product payload is shipped.
if operation == "interrupt-package" || operation == "interrupt-first-install" {
    guard args.count==5 else{fail("Supply package, owned transaction, helper digest and log directory")}
    let package=args[1],transaction=args[2],expectedDigest=args[3],logs=args[4],fresh=operation == "interrupt-first-install"
    let authorityValid=fresh ? transaction.hasPrefix("/Applications/.") && transaction.hasSuffix(".lmg-install.json"):transaction.hasPrefix("/Library/Application Support/Local Media Gallery Updates/")
    guard package.hasPrefix("/"),authorityValid,expectedDigest.count==64 else{fail("Invalid interruption identity")}
    let monitor=fresh ? transaction:transaction+"/journal.json"
    func admittedPhase(_ value:[String:Any])->String? {
        if !fresh {guard let phase=value["phase"] as? String,["prepared","applying","activated"].contains(phase) else{return nil};return phase}
        guard let directory=value["directory"] as? String,directory.hasPrefix("/Applications/"),let command=value["command"] as? String,!FileManager.default.fileExists(atPath:command),let payload=value["payload"] as? [String:Any],let files=payload["files"] as? [[String:Any]] else{return nil}
        let present=files.filter{if let relative=$0["path"] as? String{return FileManager.default.fileExists(atPath:directory+"/"+relative)};return false}.count
        return present>0 && present<files.count ? "install-intent-with-partial-app":nil
    }
    guard let library=dlopen("/usr/lib/libproc.dylib",RTLD_NOW),let listSymbol=dlsym(library,"proc_listallpids"),let pathSymbol=dlsym(library,"proc_pidpath") else{fail("Process inspection unavailable")}
    typealias ListPids = @convention(c) (UnsafeMutableRawPointer?,Int32)->Int32
    typealias PidPath = @convention(c) (Int32,UnsafeMutableRawPointer?,UInt32)->Int32
    let listPids=unsafeBitCast(listSymbol,to:ListPids.self),pidPath=unsafeBitCast(pathSymbol,to:PidPath.self)
    do{try FileManager.default.createDirectory(atPath:logs,withIntermediateDirectories:true)}catch{fail("Observer logs: \(error)")}
    let out=logs+"/installer.stdout.log",err=logs+"/installer.stderr.log";FileManager.default.createFile(atPath:out,contents:nil);FileManager.default.createFile(atPath:err,contents:nil)
    let process=Process();process.executableURL=URL(fileURLWithPath:"/usr/sbin/installer");process.arguments=["-verboseR","-pkg",package,"-target","/"];process.standardInput=FileHandle.nullDevice;process.standardOutput=FileHandle(forWritingAtPath:out);process.standardError=FileHandle(forWritingAtPath:err)
    do{try process.run()}catch{fail("Installer launch: \(error)")}
    let deadline=Date().addingTimeInterval(60);var coordinator:Int32?=nil,path="",phase="",interrupted=false,liveAuthority:[String:Any]=[:]
    defer{dlclose(library)}
    while Date()<deadline && process.isRunning {
        if coordinator == nil {
            var pids=[Int32](repeating:0,count:16384)
            let count=pids.withUnsafeMutableBytes{listPids($0.baseAddress,Int32($0.count))}
            if count>0 {for pid in pids.prefix(min(Int(count),pids.count)) where pid>0 {
                var buffer=[CChar](repeating:0,count:4096)
                let size=buffer.withUnsafeMutableBytes{pidPath(pid,$0.baseAddress,UInt32($0.count))}
                if size>0 {
                    let file=String(cString:buffer)
                    if file.contains("PKInstallSandbox") && file.hasSuffix("/lmg-setup"),let data=try? Data(contentsOf:URL(fileURLWithPath:file)) {
                        let digest=SHA256.hash(data:data).map{String(format:"%02x",$0)}.joined()
                        if digest==expectedDigest {coordinator=pid;path=file;break}
                    }
                }
            }}
        }
        if let pid=coordinator,let data=try? Data(contentsOf:URL(fileURLWithPath:monitor)),let journal=(try? JSONSerialization.jsonObject(with:data)) as? [String:Any],let current=admittedPhase(journal) {
            phase=current
            if fresh || ["prepared","applying","activated"].contains(current) {
                guard kill(pid,SIGSTOP)==0 else{fail("Could not stop owned coordinator")}
                guard let stopped=try? Data(contentsOf:URL(fileURLWithPath:monitor)),let value=(try? JSONSerialization.jsonObject(with:stopped)) as? [String:Any],let stoppedPhase=admittedPhase(value) else {kill(pid,SIGCONT);fail("Coordinator passed the admitted interruption boundary")}
                phase=stoppedPhase
                // Replay only the authentic embedded facade, with no descriptor operands,
                // while the first owner is stopped and still holds its OS lease.
                let liveErr=logs+"/live-authority.stderr.log",liveOut=logs+"/live-authority.stdout.log";FileManager.default.createFile(atPath:liveErr,contents:nil);FileManager.default.createFile(atPath:liveOut,contents:nil)
                let replay=Process();replay.executableURL=URL(fileURLWithPath:path);replay.arguments=["managed-install"];replay.standardInput=FileHandle.nullDevice;replay.standardOutput=FileHandle(forWritingAtPath:liveOut);replay.standardError=FileHandle(forWritingAtPath:liveErr)
                do{try replay.run()}catch{kill(pid,SIGKILL);fail("Live authority replay: \(error)")}
                let replayDeadline=Date().addingTimeInterval(15);while replay.isRunning && Date()<replayDeadline{Thread.sleep(forTimeInterval:0.01)}
                if replay.isRunning{replay.terminate();kill(pid,SIGKILL);fail("Live coordinator replay failed to return")}
                let refusal=(try? String(contentsOfFile:liveErr,encoding:.utf8)) ?? "",lower=refusal.lowercased()
                guard replay.terminationStatus != 0 && ["lock","another","busy","active"].contains(where:{lower.contains($0)}) else{kill(pid,SIGKILL);fail("Live coordinator was not refused by ownership authority: \(refusal)")}
                liveAuthority=["exit":Int(replay.terminationStatus),"stderr":refusal,"result":"refused"]
                guard kill(pid,SIGKILL)==0 else{kill(pid,SIGCONT);fail("Could not interrupt owned coordinator")};interrupted=true;break
            }
        }
        Thread.sleep(forTimeInterval:coordinator == nil ? 0.01:0.0005)
    }
    guard interrupted,let coordinator=coordinator else{if process.isRunning{process.terminate()};let stdout=(try? String(contentsOfFile:out,encoding:.utf8)) ?? "",stderr=(try? String(contentsOfFile:err,encoding:.utf8)) ?? "";fail("No admitted owned PKG interruption before deadline (phase \(phase), coordinator \(coordinator.map(String.init) ?? "none")). Installer stdout: \(stdout.suffix(16000)) stderr: \(stderr.suffix(16000))")}
    let completion=Date().addingTimeInterval(20);while process.isRunning && Date()<completion{Thread.sleep(forTimeInterval:0.05)}
    guard !process.isRunning else{process.terminate();fail("Installer did not settle after coordinator interruption")}
    guard process.terminationStatus != 0 else{fail("Interrupted Installer incorrectly reported success")}
    emit(["coordinatorPid":Int(coordinator),"coordinatorPath":path,"helperSha256":expectedDigest,"phase":phase,"transaction":transaction,"installerExit":Int(process.terminationStatus),"liveAuthority":liveAuthority,"stdout":out,"stderr":err,"result":"interrupted"]);exit(0)
}
if operation == "preflight" {emit(["accessibility":AXIsProcessTrusted(),"screenCapture":CGPreflightScreenCaptureAccess()]);exit(0)}
if operation == "launch-executable" {
    guard args.count>=2 else{fail("Supply executable")}
    let process=Process();process.executableURL=URL(fileURLWithPath:args[1]);process.arguments=Array(args.dropFirst(2));process.environment=["PATH":"/usr/bin:/bin:/usr/sbin:/sbin","HOME":NSHomeDirectory()];process.standardInput=FileHandle.nullDevice;process.standardOutput=FileHandle.nullDevice;process.standardError=FileHandle.nullDevice
    do{try process.run()}catch{fail("Bare executable launch: \(error)")}
    let pid=process.processIdentifier,deadline=Date().addingTimeInterval(25)
    while Date()<deadline {
        guard process.isRunning else{fail("Bare executable exited \(process.terminationStatus)")}
        if let app=NSRunningApplication(processIdentifier:pid),app.isFinishedLaunching {
            app.activate(options:[]);emit(["pid":Int(pid),"bundle":app.bundleURL?.path ?? "","executable":app.executableURL?.path ?? args[1]]);exit(0)
        }
        RunLoop.current.run(until:Date().addingTimeInterval(0.05))
    }
    process.terminate();fail("Bare executable GUI readiness deadline")
}
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
// WebKit enables its remote AX tree asynchronously. Keep one client/run loop
// alive while that tree arrives, rather than dropping the client after an
// immediate window/menu-only traversal and repeating it in another process.
let deadline=Date().addingTimeInterval(8)
var observer:AXObserver?
let observerStatus=AXObserverCreate(pid,{_,_,_,_ in},&observer)
var notificationStatuses:[String:Int32]=[:]
if let observer=observer {
    CFRunLoopAddSource(CFRunLoopGetCurrent(),AXObserverGetRunLoopSource(observer),.defaultMode)
    for name in [kAXFocusedUIElementChangedNotification,kAXFocusedWindowChangedNotification,kAXWindowCreatedNotification] {
        notificationStatuses[name]=AXObserverAddNotification(observer,application,name as CFString,nil).rawValue
    }
}
func enableAccessibility(_ name:String)->[String:Any] {
    let before=attribute(application,name) as? Bool
    let status=before == true ? AXError.success:AXUIElementSetAttributeValue(application,name as CFString,kCFBooleanTrue)
    let after=attribute(application,name) as? Bool
    return ["before":before.map{$0 as Any} ?? NSNull(),"setStatus":status.rawValue,"after":after.map{$0 as Any} ?? NSNull()]
}
let enhanced=enableAccessibility("AXEnhancedUserInterface"),manual=enableAccessibility("AXManualAccessibility")
var queue:[(AXUIElement,Int)]=[],records:[[String:Any]]=[],found:AXUIElement?=nil
let wanted=operation == "press" && args.count>2 ? args[2]:""
var scans=0,webContent=false,overflow=false,hashCollisions=0
repeat {
    queue=[(application,0)];records=[];found=nil;webContent=false;scans+=1
    var visited:[CFHashCode:[AXUIElement]]=[:],cursor=0
    while cursor<queue.count && records.count<2500 && Date()<deadline {
        let (element,depth)=queue[cursor];cursor+=1
        let key=CFHash(element),bucket=visited[key] ?? []
        if bucket.contains(where:{CFEqual($0,element)}){continue}
        if !bucket.isEmpty{hashCollisions+=1}
        visited[key,default:[]].append(element);AXUIElementSetMessagingTimeout(element,0.1)
        let title=attribute(element,"AXTitle") as? String ?? "",desc=attribute(element,"AXDescription") as? String ?? "",value=attribute(element,"AXValue") as? String ?? "",role=attribute(element,"AXRole") as? String ?? ""
        let name=title.isEmpty ? desc:title;records.append(["name":name,"title":title,"description":desc,"value":value,"role":role,"depth":depth,"enabled":attribute(element,"AXEnabled") as? Bool ?? false])
        if !wanted.isEmpty && (name==wanted || desc==wanted || title==wanted){found=element}
        if depth<35,let children=attribute(element,"AXChildren") as? [AXUIElement]{
            if role == "AXWebArea" && !children.isEmpty{webContent=true}
            queue.append(contentsOf:children.map{($0,depth+1)})
        }
    }
    overflow=cursor<queue.count
    if webContent && (operation != "press" || found != nil){break}
    if Date()<deadline{RunLoop.current.run(until:min(deadline,Date().addingTimeInterval(0.1)))}
} while Date()<deadline
let accessibility:[String:Any]=["observerStatus":observerStatus.rawValue,"notifications":notificationStatuses,"enhanced":enhanced,"manual":manual,"scans":scans,"webContent":webContent,"hashCollisions":hashCollisions]
if operation == "press" {guard let found=found else{emit(["records":records,"missing":wanted,"accessibility":accessibility]);exit(2)};let status=AXUIElementPerformAction(found,kAXPressAction as CFString);if status != .success{fail("AXPress failed \(status.rawValue)")};emit(["pressed":wanted]);exit(0)}
var result:[String:Any]=["pid":Int(pid),"bundle":app.bundleURL?.path ?? "","executable":app.executableURL?.path ?? "","records":records,"overflow":overflow,"accessibility":accessibility]
if operation == "screenshot" {
    guard args.count>2 else{fail("Supply screenshot output")}
    guard let list=CGWindowListCopyWindowInfo([.optionOnScreenOnly,.excludeDesktopElements],kCGNullWindowID) as? [[String:Any]],let window=list.first(where:{($0[kCGWindowOwnerPID as String] as? Int)==Int(pid)&&($0[kCGWindowLayer as String] as? Int)==0}),let number=window[kCGWindowNumber as String] as? Int else{fail("No native app window")}
    let process=Process();process.executableURL=URL(fileURLWithPath:"/usr/sbin/screencapture");process.arguments=["-x","-l",String(number),args[2]];process.standardInput=FileHandle.nullDevice;do{try process.run();process.waitUntilExit()}catch{fail("Capture: \(error)")};guard process.terminationStatus==0,let data=try? Data(contentsOf:URL(fileURLWithPath:args[2])),let image=NSBitmapImageRep(data:data) else{fail("Window capture failed")}
    var red=0,green=0
    for y in 0..<image.pixelsHigh {for x in 0..<image.pixelsWide {if let c=image.colorAt(x:x,y:y)?.usingColorSpace(.deviceRGB){if c.redComponent>0.65 && c.greenComponent<0.25 && c.blueComponent<0.25{red+=1};if c.greenComponent>0.6 && c.redComponent<0.3 && c.blueComponent<0.3{green+=1}}}}
    result["window"]=number;result["pixels"]=["red":red,"green":green,"width":image.pixelsWide,"height":image.pixelsHigh]
}
emit(result)
