import Foundation
import Darwin

final class ChromeBridge {
    private var listener:Int32 = -1
    private var client:Int32 = -1
    private var ready=false
    private let serial=DispatchQueue(label:"vector.chrome")
    private var pending:[String:(Result<Any,Error>)->Void]=[:]
    private var generation=UUID().uuidString
    func start() throws {
        signal(SIGPIPE,SIG_IGN)
        try FileManager.default.createDirectory(at:Wire.directory,withIntermediateDirectories:true,attributes:[.posixPermissions:0o700])
        if let existing=Wire.connectSocket(){close(existing);throw VectorError(message:"Another Vector instance is running. Quit it before opening this copy.")}
        unlink(Wire.path)
        guard var address=Wire.address(Wire.path) else{throw VectorError(message:"Vector data path is too long.")}
        listener=socket(AF_UNIX,SOCK_STREAM,0)
        let result=withUnsafePointer(to:&address){p in p.withMemoryRebound(to:sockaddr.self,capacity:1){Darwin.bind(listener,$0,socklen_t(MemoryLayout<sockaddr_un>.size))}}
        guard result==0,listen(listener,4)==0 else{throw VectorError(message:"Could not start Chrome connection.")}
        chmod(Wire.path,0o600)
        DispatchQueue.global().async{[self] in while listener>=0 {let fd=accept(listener,nil,nil);if fd<0{break};var uid:uid_t=0;var gid:gid_t=0;guard getpeereid(fd,&uid,&gid)==0,uid==getuid() else{close(fd);continue};serial.async{self.acceptClient(fd)}}}
    }
    private func acceptClient(_ fd:Int32){
        guard client<0 else{Wire.write(fd,["event":"unavailable","error":"Vector is connected in another Chrome profile. Disconnect it first."]);close(fd);return}
        client=fd;ready=false;let session=UUID().uuidString;generation=session
        DispatchQueue.global().async{[self] in while let data=Wire.read(fd){serial.async{if self.generation==session{self.receive(data)}}};serial.async{if self.generation==session{self.disconnect()}}}
    }
    private func receive(_ object:[String:Any]){
        if object["event"] as? String=="hello"{ready=true;Wire.write(client,["event":"ready"]);return}
        guard let id=object["id"] as? String,let done=pending.removeValue(forKey:id) else{return}
        let result:Result<Any,Error> = object["ok"] as? Bool==true ? .success(object["value"] ?? [:]) : .failure(VectorError(message:object["error"] as? String ?? "Chrome action failed."))
        DispatchQueue.main.async{done(result)}
    }
    private func disconnect(){
        if client>=0{shutdown(client,SHUT_RDWR);close(client)};client = -1;ready=false;generation=UUID().uuidString
        let callbacks=Array(pending.values);pending=[:];DispatchQueue.main.async{for done in callbacks{done(.failure(VectorError(message:"Chrome disconnected. Check Marketplace before retrying any send or publication.")))}}
    }
    func cancel(){serial.async{self.disconnect()}}
    func request(_ method:String,_ args:[String:Any]=[:],completion:@escaping(Result<Any,Error>)->Void){
        serial.async{
            guard self.ready,self.client>=0 else{DispatchQueue.main.async{completion(.failure(VectorError(message:"Connect the Vector extension in Chrome first.")))};return}
            let id=UUID().uuidString;self.pending[id]=completion
            guard Wire.write(self.client,["id":id,"method":method,"args":args,"expiresAt":Date().timeIntervalSince1970*1000+45_000]) else{self.disconnect();return}
            self.serial.asyncAfter(deadline:.now()+46){if self.pending[id] != nil{self.disconnect()}}
        }
    }
}
