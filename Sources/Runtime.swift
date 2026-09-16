import Foundation

final class Runtime {
    let directory: URL
    private let lock=NSLock()
    private var process: Process?
    init(directory: URL) { self.directory=directory;cleanupAbandonedRuns() }
    private func cleanupAbandonedRuns() {
        let runs=directory.appendingPathComponent("Runs",isDirectory:true)
        guard let children=try? FileManager.default.contentsOfDirectory(at:runs,includingPropertiesForKeys:nil) else{return}
        for child in children {try? FileManager.default.removeItem(at:child)}
    }
    func executable(_ provider: String) -> String? {
        let home=FileManager.default.homeDirectoryForCurrentUser.path
        let name=provider=="Claude Code" ? "claude" : "codex"
        return [home+"/.local/bin/"+name,home+"/.npm-global/bin/"+name,"/opt/homebrew/bin/"+name,"/usr/local/bin/"+name].first{FileManager.default.isExecutableFile(atPath:$0)}
    }
    func cancel(){lock.lock();let p=process;lock.unlock();if p?.isRunning==true {p?.terminate()}}
    static func failureMessage(provider:String, diagnostic:String) -> String {
        let text=diagnostic.lowercased()
        if text.contains("usage limit") || text.contains("rate limit") || text.contains("quota") {
            return "\(provider) usage limit reached. Check your subscription usage, then reconnect in Connections when available."
        }
        if text.contains("unauthorized") || text.contains("not logged in") || text.contains("authentication") {
            return "\(provider) sign-in needs attention. Sign into its official CLI, then reconnect in Connections."
        }
        // CLI stderr can echo the full task, including private buyer messages.
        return "\(provider) request failed. Check its CLI login and availability, then retry from Activity."
    }
    func run(executable:String, arguments:[String], input:String, cwd:URL, timeout:Double=180) throws -> (Int32,String,String) {
        let p=Process();p.executableURL=URL(fileURLWithPath:executable);p.arguments=arguments;p.currentDirectoryURL=cwd
        var env=ProcessInfo.processInfo.environment
        let home=FileManager.default.homeDirectoryForCurrentUser.path
        env["PATH"]=home+"/.local/bin:"+home+"/.npm-global/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
        // Use the user's existing official CLI subscription login, not an inherited API key.
        for key in ["OPENAI_API_KEY","CODEX_API_KEY","CODEX_ACCESS_TOKEN","ANTHROPIC_API_KEY","ANTHROPIC_AUTH_TOKEN","CLAUDECODE","CODEX_THREAD_ID","CODEX_INTERNAL_ORIGINATOR_OVERRIDE"] {env.removeValue(forKey:key)}
        env["RUST_LOG"]="error";p.environment=env
        let stdin=Pipe(),stdout=Pipe(),stderr=Pipe();p.standardInput=stdin;p.standardOutput=stdout;p.standardError=stderr
        let reads=DispatchGroup();let dataLock=NSLock();var outputData=Data(),errorData=Data()
        reads.enter();DispatchQueue.global(qos:.utility).async{let data=(try? stdout.fileHandleForReading.readToEnd()) ?? Data();dataLock.lock();outputData=data;dataLock.unlock();reads.leave()}
        reads.enter();DispatchQueue.global(qos:.utility).async{let data=(try? stderr.fileHandleForReading.readToEnd()) ?? Data();dataLock.lock();errorData=data;dataLock.unlock();reads.leave()}
        lock.lock();process=p;lock.unlock()
        defer{lock.lock();if process===p {process=nil};lock.unlock()}
        try p.run();try? stdout.fileHandleForWriting.close();try? stderr.fileHandleForWriting.close();stdin.fileHandleForWriting.write(Data(input.utf8));try? stdin.fileHandleForWriting.close()
        let deadline=Date().addingTimeInterval(timeout)
        while p.isRunning && Date()<deadline {Thread.sleep(forTimeInterval:0.1)}
        if p.isRunning {p.terminate();p.waitUntilExit();reads.wait();throw VectorError(message:"AI request timed out. Retry from Activity.")}
        p.waitUntilExit();reads.wait();dataLock.lock();let out=String(data:outputData,encoding:.utf8) ?? "",err=String(data:errorData,encoding:.utf8) ?? "";dataLock.unlock()
        return (p.terminationStatus,out,err)
    }
    func infer(provider:String,prompt:String,schema:[String:Any]) throws -> Any {
        guard let exe=executable(provider) else {throw VectorError(message:"Install and sign into \(provider) first.")}
        let dir=directory.appendingPathComponent("Runs/"+UUID().uuidString)
        try FileManager.default.createDirectory(at:dir,withIntermediateDirectories:true,attributes:[.posixPermissions:0o700])
        defer {try? FileManager.default.removeItem(at:dir)}
        let schemaData=try JSONSerialization.data(withJSONObject:schema)
        let schemaURL=dir.appendingPathComponent("schema.json"),resultURL=dir.appendingPathComponent("result.json")
        try schemaData.write(to:schemaURL)
        let args:[String]
        if provider=="Claude Code" {
            args=["-p","--safe-mode","--tools","","--strict-mcp-config","--mcp-config","{\"mcpServers\":{}}","--no-session-persistence","--output-format","json","--json-schema",String(data:schemaData,encoding:.utf8)!]
        } else {
            args=["exec","--ignore-user-config","--skip-git-repo-check","--ephemeral","--sandbox","read-only","--disable","shell_tool","--disable","apps","--disable","multi_agent","-c","web_search=\"disabled\"","--color","never","--output-schema",schemaURL.path,"-o",resultURL.path,"-"]
        }
        let (code,out,err)=try run(executable:exe,arguments:args,input:prompt,cwd:dir)
        guard code==0 else {throw VectorError(message:Self.failureMessage(provider:provider,diagnostic:err.isEmpty ? out:err))}
        if provider=="Claude Code" {
            guard let object=try JSONSerialization.jsonObject(with:Data(out.utf8)) as? [String:Any],object["is_error"] as? Bool != true else {throw VectorError(message:"Claude returned an error. Check the CLI login and usage limits.")}
            if let structured=object["structured_output"] {return structured}
            if let result=object["result"] as? String,let data=result.data(using:.utf8),let parsed=try? JSONSerialization.jsonObject(with:data) {return parsed}
            throw VectorError(message:"Claude did not return structured output.")
        }
        guard let data=try? Data(contentsOf:resultURL) else {throw VectorError(message:"Codex returned no structured result. Retry from Activity.")}
        return try JSONSerialization.jsonObject(with:data)
    }
}
