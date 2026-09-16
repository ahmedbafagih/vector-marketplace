import Foundation
import Darwin
var fds:[Int32]=[0,0]
precondition(socketpair(AF_UNIX,SOCK_STREAM,0,&fds)==0)
let message:[String:Any]=["id":"fixture","text":"Unicode café 🪑","ok":true]
precondition(Wire.write(fds[0],message));let got=Wire.read(fds[1]);precondition(got?["text"] as? String==message["text"] as? String)
var oversized=UInt32(Wire.maxBytes+1).littleEndian
withUnsafeBytes(of:&oversized){_ = Darwin.write(fds[0],$0.baseAddress!,4)}
precondition(Wire.read(fds[1])==nil)
close(fds[0]);close(fds[1]);print("PASS: native framing round trip, Unicode and oversized-frame rejection")
