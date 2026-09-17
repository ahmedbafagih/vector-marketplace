import Foundation
import Darwin
signal(SIGPIPE,SIG_IGN)
let origin=CommandLine.arguments.dropFirst().first ?? ""
let config=URL(fileURLWithPath:CommandLine.arguments[0]).deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("Resources/chrome-config.json")
guard let bytes=try? Data(contentsOf:config),let settings=(try? JSONSerialization.jsonObject(with:bytes)) as? [String:Any],let ids=settings["extensionIDs"] as? [String],ids.contains(where:{origin=="chrome-extension://"+$0+"/"}) else{exit(1)}
guard let fd=Wire.connectSocket() else{Wire.write(STDOUT_FILENO,["event":"unavailable","error":"Open Marketplace AI, then press Connect again."]);exit(0)}
DispatchQueue.global().async {while let message=Wire.read(fd){if !Wire.write(STDOUT_FILENO,message){break}};exit(0)}
while let message=Wire.read(STDIN_FILENO){if !Wire.write(fd,message){break}}
shutdown(fd,SHUT_RDWR);close(fd)
