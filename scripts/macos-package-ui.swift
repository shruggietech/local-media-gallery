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

struct InterruptionFailure: Error, CustomStringConvertible {
    let description: String
    init(_ text: String) { description = text }
}
func requireObservation(_ value: Bool, _ message: String) throws {
    if !value { throw InterruptionFailure(message) }
}
func observationTime() -> String {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter.string(from: Date())
}
struct ObservedActor {
    let pid: Int32
    let parentPid: Int32
    let startSeconds: UInt64
    let startMicros: UInt64
    let path: String
    let sha256: String
    let status: Int32
    var birth: String { "\(pid):\(startSeconds):\(startMicros)" }
    var json: [String:Any] {
        ["pid":Int(pid),"parentPid":Int(parentPid),"startSeconds":startSeconds,
         "startMicros":startMicros,"path":path,"sha256":sha256,"status":Int(status)]
    }
}
func sameActor(_ left: ObservedActor, _ right: ObservedActor) -> Bool {
    left.birth == right.birth && left.parentPid == right.parentPid && left.path == right.path && left.sha256 == right.sha256
}
func bornAfter(_ actor: ObservedActor, _ owner: ObservedActor) -> Bool {
    actor.startSeconds > owner.startSeconds || (actor.startSeconds == owner.startSeconds && actor.startMicros >= owner.startMicros)
}
func processFacts(_ pid: Int32) throws -> proc_bsdinfo? {
    var info = proc_bsdinfo()
    errno = 0
    let size = Int32(MemoryLayout<proc_bsdinfo>.size)
    // Include unreaped exited processes. With arg=0 BSD-info returns ESRCH
    // while kill(pid,0) can still succeed for the same zombie.
    let result = proc_pidinfo(pid, PROC_PIDTBSDINFO, 1, &info, size)
    if result == size { return info }
    let inspectionError = errno
    errno = 0
    if kill(pid, 0) == -1 && errno == ESRCH { return nil }
    throw InterruptionFailure("Process identity unavailable pid=\(pid) returned=\(result) required=\(size) errno=\(inspectionError)")
}
func executablePath(_ pid: Int32) -> String? {
    var bytes = [CChar](repeating:0,count:4096)
    let result = bytes.withUnsafeMutableBytes { proc_pidpath(pid,$0.baseAddress,UInt32($0.count)) }
    return result > 0 ? String(cString:bytes) : nil
}
func inspectActor(_ pid: Int32) throws -> ObservedActor? {
    guard let info = try processFacts(pid) else { return nil }
    guard let file = executablePath(pid) else { throw InterruptionFailure("Executable path unavailable pid=\(pid) errno=\(errno)") }
    let bytes = try Data(contentsOf:URL(fileURLWithPath:file))
    let digest = SHA256.hash(data:bytes).map { String(format:"%02x",$0) }.joined()
    return ObservedActor(pid:pid,parentPid:Int32(info.pbi_ppid),startSeconds:UInt64(info.pbi_start_tvsec),startMicros:UInt64(info.pbi_start_tvusec),path:file,sha256:digest,status:Int32(info.pbi_status))
}
func matchingCoordinators(_ digest: String) throws -> [ObservedActor] {
    var pids = [Int32](repeating:0,count:16384)
    let count = pids.withUnsafeMutableBytes { proc_listallpids($0.baseAddress,Int32($0.count)) }
    try requireObservation(count >= 0 && Int(count) < pids.count,"Process snapshot unavailable or truncated")
    var result: [ObservedActor] = []
    for pid in pids.prefix(Int(count)) where pid > 0 {
        guard let file = executablePath(pid),file.contains("PKInstallSandbox"),file.hasSuffix("/lmg-setup") else { continue }
        if let actor = try inspectActor(pid),actor.sha256 == digest { result.append(actor) }
    }
    return result
}
func selectCoordinator(_ candidates: [ObservedActor], _ before: Set<String>, _ installer: ObservedActor) throws -> ObservedActor? {
    let eligible = candidates.filter { !before.contains($0.birth) && bornAfter($0,installer) }
    try requireObservation(eligible.count <= 1,"Ambiguous new package coordinators")
    return eligible.first
}
func sandboxRoot(_ file: String) throws -> String {
    let pieces = file.components(separatedBy:"/")
    guard let index = pieces.firstIndex(where:{$0.contains("PKInstallSandbox")}) else { throw InterruptionFailure("Coordinator has no package sandbox") }
    return pieces.prefix(index+1).joined(separator:"/")
}
func admittedInterruptionPhase(_ value: [String:Any], fresh: Bool, generation: String, transaction: String, exists: (String)->Bool) -> String? {
    if !fresh {
        guard let next = value["next"] as? [String:Any],next["generation"] as? String == generation,
              transaction == "/Library/Application Support/Local Media Gallery Updates/"+generation,
              let phase = value["phase"] as? String,["prepared","applying","activated"].contains(phase) else { return nil }
        return phase
    }
    let bundle = String(transaction.dropFirst("/Applications/.".count).dropLast(".lmg-install.json".count))
    guard let directory = value["directory"] as? String,directory == "/Applications/"+bundle,
          let command = value["command"] as? String,!exists(command),
          let payload = value["payload"] as? [String:Any],payload["generation"] as? String == generation,
          let files = payload["files"] as? [[String:Any]],!files.isEmpty else { return nil }
    var present = 0
    for file in files {
        guard let relative = file["path"] as? String,!relative.isEmpty,!relative.hasPrefix("/"),!relative.components(separatedBy:"/").contains("..") else { return nil }
        if exists(directory+"/"+relative) { present += 1 }
    }
    return present > 0 && present < files.count ? "install-intent-with-partial-app" : nil
}
func signalBoundActor(_ actor: ObservedActor, signal: Int32, name: String,
                      inspect: () throws -> ObservedActor?, send: (Int32,Int32)->(Int32,Int32),
                      record: ([String:Any])->Void) throws -> ObservedActor {
    let observed: ObservedActor?
    do { observed = try inspect() } catch {
        record(["signalName":name,"result":"inspection-failed","expected":actor.json,"error":String(describing:error)])
        throw error
    }
    guard let current = observed,sameActor(current,actor) else {
        record(["signalName":name,"result":"identity-refused","expected":actor.json,"observed":observed.map{$0.json as Any} ?? NSNull()])
        throw InterruptionFailure("Refused stale, exited or changed coordinator before \(name)")
    }
    let (result,error) = send(current.pid,signal)
    record(["signalName":name,"signal":Int(signal),"identity":current.json,"result":Int(result),"errno":Int(error),"at":observationTime()])
    try requireObservation(result == 0,"Coordinator \(name) failed pid=\(current.pid) errno=\(error)")
    return current
}
func waitForStopped(_ actor: ObservedActor, deadline: Date, inspect: () throws -> ObservedActor?, pause: ()->Void) throws -> ObservedActor {
    while Date() < deadline {
        guard let current = try inspect(),sameActor(current,actor) else { throw InterruptionFailure("Coordinator identity retired while waiting for STOP") }
        if current.status == SSTOP { return current }
        pause()
    }
    throw InterruptionFailure("Coordinator STOP delivery deadline")
}
func interruptionSelfTest() throws -> [String:Any] {
    let hash = String(repeating:"a",count:64),generation = String(repeating:"b",count:32)
    func actor(_ pid:Int32 = 23,_ start:UInt64 = 200,_ status:Int32 = SRUN,_ parent:Int32 = 2,_ digest:String? = nil)->ObservedActor {
        ObservedActor(pid:pid,parentPid:parent,startSeconds:start,startMicros:17,path:"/private/PKInstallSandbox.test/Scripts/owned/lmg-setup",sha256:digest ?? hash,status:status)
    }
    let owned = actor(),installer = actor(19,199)
    var checks:[String] = [],signals = 0
    func rejected(_ name:String,_ work:() throws -> Void) throws {
        var failed = false
        do { try work() } catch { failed = true }
        try requireObservation(failed,"Selftest should reject \(name)");checks.append(name)
    }
    for (name,current) in [("exited",nil as ObservedActor?),("reused PID",actor(23,201)),("changed executable",actor(23,200,SRUN,2,String(repeating:"c",count:64))),("changed parent",actor(23,200,SRUN,3))] {
        try rejected(name) { _ = try signalBoundActor(owned,signal:SIGSTOP,name:"STOP",inspect:{current},send:{_,_ in signals += 1;return (0,0)},record:{_ in}) }
    }
    try requireObservation(signals == 0,"Rejected identities were signalled")
    try requireObservation(try selectCoordinator([owned],Set([owned.birth]),installer) == nil,"Pre-existing coordinator admitted");checks.append("pre-existing actor")
    try requireObservation(try selectCoordinator([actor(23,198)],Set(),installer) == nil,"Older actor admitted");checks.append("old birth")
    try rejected("ambiguous actors") { _ = try selectCoordinator([owned,actor(24)],Set(),installer) }
    var reads = 0
    let stopped = try waitForStopped(owned,deadline:Date().addingTimeInterval(0.1),inspect:{reads += 1;return reads == 1 ? owned:actor(23,200,SSTOP)},pause:{})
    try requireObservation(reads == 2 && stopped.status == SSTOP,"STOP delivery was not observed");checks.append("delayed STOP delivery")
    try rejected("STOP delivery timeout") { _ = try waitForStopped(owned,deadline:Date(),inspect:{owned},pause:{}) }
    try rejected("reused while awaiting STOP") { _ = try waitForStopped(owned,deadline:Date().addingTimeInterval(0.1),inspect:{actor(23,201)},pause:{}) }
    try rejected("cleanup resume identity refusal") { _ = try signalBoundActor(owned,signal:SIGCONT,name:"CONT",inspect:{nil},send:{_,_ in signals += 1;return (0,0)},record:{_ in}) }
    var signalError:[String:Any] = [:]
    try rejected("signal errno") { _ = try signalBoundActor(owned,signal:SIGSTOP,name:"STOP",inspect:{owned},send:{_,_ in (-1,ESRCH)},record:{signalError=$0}) }
    try requireObservation(signalError["errno"] as? Int == Int(ESRCH),"Signal errno lost")
    let transaction = "/Applications/.Full.app.lmg-install.json"
    let intent:[String:Any] = ["directory":"/Applications/Full.app","command":"/usr/local/bin/local-media-gallery","payload":["generation":generation,"files":[["path":"one"],["path":"two"]]]]
    let partial:(String)->Bool = {$0.hasSuffix("/one")}
    try requireObservation(admittedInterruptionPhase(intent,fresh:true,generation:generation,transaction:transaction,exists:partial) != nil,"Valid partial intent refused");checks.append("partial intent")
    try requireObservation(admittedInterruptionPhase(intent,fresh:true,generation:String(repeating:"c",count:32),transaction:transaction,exists:partial) == nil,"Wrong generation admitted");checks.append("wrong generation")
    try requireObservation(admittedInterruptionPhase(intent,fresh:true,generation:generation,transaction:transaction,exists:{_ in true}) == nil,"Complete install admitted");checks.append("missed partial boundary")
    _ = try signalBoundActor(stopped,signal:SIGCONT,name:"CONT",inspect:{stopped},send:{_,_ in signals += 1;return (0,0)},record:{_ in});try requireObservation(signals == 1,"Unadmitted stop did not resume");checks.append("resume unadmitted stop")
    let update:[String:Any] = ["phase":"prepared","next":["generation":generation]]
    try requireObservation(admittedInterruptionPhase(update,fresh:false,generation:generation,transaction:"/Library/Application Support/Local Media Gallery Updates/"+generation,exists:{_ in false}) == "prepared","Update generation refused");checks.append("update generation")
    let exitedPid=lmg_observer_exited_fixture()
    try requireObservation(exitedPid > 0,"Could not create owned process-lifetime fixture")
    defer { var status:Int32=0;_ = kill(exitedPid,SIGKILL);_ = waitpid(exitedPid,&status,0) }
    let exitedDeadline=Date().addingTimeInterval(2)
    var observedZombie=false
    while Date() < exitedDeadline {
        if let facts=try processFacts(exitedPid),Int32(facts.pbi_status) == SZOMB { observedZombie=true;break }
        Thread.sleep(forTimeInterval:0.001)
    }
    try requireObservation(observedZombie,"Unreaped exited process must retain SDK birth/status facts");checks.append("real unreaped exit identity")
    return ["result":"pass","observerProtocol":"operation-bound-v1","checks":checks]
}
func observePackageInterruption(_ args: [String]) throws -> [String:Any] {
    try requireObservation(args.count == 6,"Supply package, owned transaction, helper digest, log directory and generation")
    let package=args[1],transaction=args[2],expectedDigest=args[3],logs=args[4],generation=args[5],fresh=args[0] == "interrupt-first-install"
    let authorityValid = fresh ? transaction.hasPrefix("/Applications/.") && transaction.hasSuffix(".lmg-install.json") : transaction == "/Library/Application Support/Local Media Gallery Updates/"+generation
    try requireObservation(package.hasPrefix("/") && authorityValid && expectedDigest.count == 64 && generation.count == 32 && generation.allSatisfy({"0123456789abcdef".contains($0)}),"Invalid interruption identity")
    try FileManager.default.createDirectory(atPath:logs,withIntermediateDirectories:true)
    let out=logs+"/installer.stdout.log",err=logs+"/installer.stderr.log",monitor=fresh ? transaction : transaction+"/journal.json"
    FileManager.default.createFile(atPath:out,contents:nil);FileManager.default.createFile(atPath:err,contents:nil)
    let stdout = try FileHandle(forWritingTo:URL(fileURLWithPath:out)),stderr = try FileHandle(forWritingTo:URL(fileURLWithPath:err))
    defer { try? stdout.close();try? stderr.close() }
    let process = Process()
    process.executableURL=URL(fileURLWithPath:"/usr/sbin/installer");process.arguments=["-verboseR","-pkg",package,"-target","/"]
    process.standardInput=FileHandle.nullDevice;process.standardOutput=stdout;process.standardError=stderr
    var report:[String:Any] = ["observerProtocol":"operation-bound-v1","result":"pending","transaction":transaction,"helperSha256":expectedDigest,"stdout":out,"stderr":err]
    var observations:[[String:Any]] = [],signals:[[String:Any]] = [],dropped=0,droppedSignals=0,held:ObservedActor?=nil,installer:ObservedActor?=nil
    func note(_ item:[String:Any]) { if observations.count == 128 { observations.removeFirst();dropped += 1 };observations.append(item.merging(["at":observationTime()]){old,_ in old}) }
    func recordSignal(_ item:[String:Any]) { if signals.count == 128 { signals.removeFirst();droppedSignals += 1 };signals.append(item) }
    func persist() throws { report["droppedSignals"]=droppedSignals;report["observations"]=observations;report["droppedObservations"]=dropped;report["signals"]=signals;let bytes=try JSONSerialization.data(withJSONObject:report,options:[.sortedKeys]);try bytes.write(to:URL(fileURLWithPath:logs+"/observer.json"),options:.atomic) }
    let send:(Int32,Int32)->(Int32,Int32) = {pid,signal in errno=0;let result=kill(pid,signal);return (result,errno)}
    func signal(_ actor:ObservedActor,_ number:Int32,_ name:String) throws -> ObservedActor {
        try signalBoundActor(actor,signal:number,name:name,inspect:{try inspectActor(actor.pid)},send:send,record:{recordSignal($0)})
    }
    do {
        let before = Set(try matchingCoordinators(expectedDigest).map{$0.birth})
        let packageData = try Data(contentsOf:URL(fileURLWithPath:package)),packageDigest=SHA256.hash(data:packageData).map{String(format:"%02x",$0)}.joined()
        try process.run()
        guard let owner = try inspectActor(process.processIdentifier) else { throw InterruptionFailure("Installer exited before operation identity") }
        installer=owner
        report["operation"]=["installer":owner.json,"expectedGeneration":generation,"packageSha256":packageDigest,"before":before.sorted(),"startedAt":observationTime()]
        try persist()
        let deadline=Date().addingTimeInterval(60)
        var interrupted=false
        while Date() < deadline && process.isRunning {
            guard let coordinator = try selectCoordinator(matchingCoordinators(expectedDigest),before,owner) else { Thread.sleep(forTimeInterval:0.005);continue }
            note(["event":"candidate","identity":coordinator.json,"parent":(try? inspectActor(coordinator.parentPid)).map{$0.json as Any} ?? NSNull()])
            // Recheck uniqueness and operation birth immediately before admission.
            guard let unique = try selectCoordinator(matchingCoordinators(expectedDigest),before,owner),sameActor(unique,coordinator),process.isRunning else { continue }
            held = coordinator
            _ = try signal(coordinator,SIGSTOP,"STOP")
            let stopped = try waitForStopped(coordinator,deadline:min(deadline,Date().addingTimeInterval(1)),inspect:{try inspectActor(coordinator.pid)},pause:{Thread.sleep(forTimeInterval:0.0005)})
            let data = try? Data(contentsOf:URL(fileURLWithPath:monitor))
            let value = data.flatMap{try? JSONSerialization.jsonObject(with:$0)} as? [String:Any]
            report["lastIntent"]=value.map{$0 as Any} ?? NSNull()
            guard let value=value,let phase=admittedInterruptionPhase(value,fresh:fresh,generation:generation,transaction:transaction,exists:{FileManager.default.fileExists(atPath:$0)}) else {
                note(["event":"unadmitted-stopped-boundary","identity":stopped.json])
                _ = try signal(coordinator,SIGCONT,"CONT");held=nil
                Thread.sleep(forTimeInterval:0.001);continue
            }
            report["coordinator"]=coordinator.json;report["coordinatorPid"]=Int(coordinator.pid);report["coordinatorPath"]=coordinator.path;report["phase"]=phase
            report["binding"]=["unique":true,"new":true,"generation":generation,"sandboxRoot":try sandboxRoot(coordinator.path)]
            report["stopped"]=["confirmed":true,"identity":stopped.json,"observedAt":observationTime()]
            try persist()
            // Replay only the authentic embedded facade, without descriptor operands.
            let liveErr=logs+"/live-authority.stderr.log",liveOut=logs+"/live-authority.stdout.log"
            FileManager.default.createFile(atPath:liveErr,contents:nil);FileManager.default.createFile(atPath:liveOut,contents:nil)
            let replayOut=try FileHandle(forWritingTo:URL(fileURLWithPath:liveOut)),replayErr=try FileHandle(forWritingTo:URL(fileURLWithPath:liveErr))
            defer { try? replayOut.close();try? replayErr.close() }
            guard let current = try inspectActor(coordinator.pid),sameActor(current,coordinator),current.status == SSTOP else { throw InterruptionFailure("Stopped coordinator changed before live-authority replay") }
            let replay=Process();replay.executableURL=URL(fileURLWithPath:current.path);replay.arguments=["managed-install"];replay.standardInput=FileHandle.nullDevice;replay.standardOutput=replayOut;replay.standardError=replayErr
            try replay.run()
            let replayDeadline=min(deadline,Date().addingTimeInterval(15))
            while replay.isRunning && Date() < replayDeadline { Thread.sleep(forTimeInterval:0.01) }
            if replay.isRunning {
                let replayActor=try inspectActor(replay.processIdentifier)
                if let actor=replayActor { _ = try signal(actor,SIGTERM,"REPLAY-TERM") }
                let cleanupEnd=Date().addingTimeInterval(1)
                while replay.isRunning && Date() < cleanupEnd { Thread.sleep(forTimeInterval:0.01) }
                if replay.isRunning,let actor=replayActor { _ = try signal(actor,SIGKILL,"REPLAY-KILL") }
                let finalEnd=Date().addingTimeInterval(1)
                while replay.isRunning && Date() < finalEnd { Thread.sleep(forTimeInterval:0.01) }
                report["replayRunningAfterCleanup"]=replay.isRunning
                throw InterruptionFailure("Live authority replay did not return")
            }
            let refusal=(try? String(contentsOfFile:liveErr,encoding:.utf8)) ?? ""
            report["liveAuthority"]=["pid":Int(replay.processIdentifier),"exit":Int(replay.terminationStatus),"stderr":String(refusal.suffix(16000)),"result":"observed"]
            try requireObservation(replay.terminationStatus != 0 && ["lock","another","busy","active"].contains(where:{refusal.lowercased().contains($0)}),"Live coordinator was not refused by ownership authority")
            report["liveAuthority"]=["pid":Int(replay.processIdentifier),"exit":Int(replay.terminationStatus),"stderr":String(refusal.suffix(16000)),"result":"refused"]
            guard let beforeKill = try inspectActor(coordinator.pid),sameActor(beforeKill,coordinator),beforeKill.status == SSTOP else { throw InterruptionFailure("Stopped coordinator changed before KILL") }
            _ = try signal(coordinator,SIGKILL,"KILL")
            let retiredDeadline=Date().addingTimeInterval(2)
            var retired=false,terminalStatus:Int32?=nil
            while Date() < retiredDeadline {
                if let facts=try processFacts(coordinator.pid) {
                    if UInt64(facts.pbi_start_tvsec) != coordinator.startSeconds || UInt64(facts.pbi_start_tvusec) != coordinator.startMicros { retired=true;terminalStatus=nil;break }
                    terminalStatus=Int32(facts.pbi_status)
                    if terminalStatus == SZOMB { retired=true;break }
                } else { retired=true;terminalStatus=nil;break }
                Thread.sleep(forTimeInterval:0.001)
            }
            report["killed"]=["identity":beforeKill.json,"result":0,"errno":0,"retired":retired,"terminalStatus":terminalStatus.map{Int($0) as Any} ?? NSNull()]
            try requireObservation(retired,"Killed coordinator did not retire")
            held=nil;interrupted=true;break
        }
        try requireObservation(interrupted,"No admitted current-operation interruption before Installer completion/deadline")
        let completion=Date().addingTimeInterval(20)
        while process.isRunning && Date() < completion { Thread.sleep(forTimeInterval:0.05) }
        try requireObservation(!process.isRunning,"Installer did not settle after interruption")
        report["installerExit"]=Int(process.terminationStatus)
        try requireObservation(process.terminationStatus != 0,"Interrupted Installer incorrectly reported success")
        report["result"]="interrupted";report["terminalFinished"]=observationTime();try persist();return report
    } catch {
        report["result"]="failed";report["error"]=String(describing:error)
        if let held=held {
            do { _ = try signal(held,SIGCONT,"CONT");note(["event":"cleanup-resumed","identity":held.json]) }
            catch { note(["event":"cleanup-resume-failed","error":String(describing:error),"expected":held.json]) }
        }
        if process.isRunning {
            process.terminate()
            let end=Date().addingTimeInterval(2)
            while process.isRunning && Date() < end { Thread.sleep(forTimeInterval:0.01) }
            if process.isRunning,let owner=installer {
                do { _ = try signalBoundActor(owner,signal:SIGKILL,name:"INSTALLER-KILL",inspect:{try inspectActor(owner.pid)},send:send,record:{recordSignal($0)}) }
                catch { note(["event":"installer-cleanup-failed","error":String(describing:error)]) }
                let final=Date().addingTimeInterval(2)
                while process.isRunning && Date() < final { Thread.sleep(forTimeInterval:0.01) }
            }
        }
        report["installerRunning"]=process.isRunning
        report["installerExit"]=process.isRunning ? NSNull() : Int(process.terminationStatus) as Any
        report["installerStdoutTail"]=String(((try? String(contentsOfFile:out,encoding:.utf8)) ?? "").suffix(16000))
        report["installerStderrTail"]=String(((try? String(contentsOfFile:err,encoding:.utf8)) ?? "").suffix(16000))
        report["terminalFinished"]=observationTime();try? persist()
        throw InterruptionFailure("\(error); retained observer diagnostics at \(logs)/observer.json")
    }
}

let args=Array(CommandLine.arguments.dropFirst())
guard let operation=args.first else {fail("Supply an operation")}
// The isolated maintainer observer interrupts a real Installer-owned coordinator.
// No fault-injection hook or altered product payload is shipped.
if operation == "interruption-self-test" {
    do { emit(try interruptionSelfTest());exit(0) } catch { fail("Interruption selftest: \(error)") }
}
if operation == "interrupt-package" || operation == "interrupt-first-install" {
    do { emit(try observePackageInterruption(args));exit(0) } catch { fail("Interruption observer: \(error)") }
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
