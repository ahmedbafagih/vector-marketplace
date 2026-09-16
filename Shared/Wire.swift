import Foundation
import Darwin

enum Wire {
    static let maxBytes = 900_000
    static var directory:URL { FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/Vector") }
    static var path:String { directory.appendingPathComponent("chrome.sock").path }
    static func address(_ path:String) -> sockaddr_un? {
        var a=sockaddr_un();a.sun_family=sa_family_t(AF_UNIX)
        let bytes=Array(path.utf8CString)
        guard bytes.count<=MemoryLayout.size(ofValue:a.sun_path) else{return nil}
        withUnsafeMutableBytes(of:&a.sun_path){p in for (i,b) in bytes.enumerated(){p[i]=UInt8(bitPattern:b)}}
        a.sun_len=UInt8(MemoryLayout<sockaddr_un>.size);return a
    }
    static func readExact(_ fd:Int32,_ count:Int)->Data? {
        var data=Data(count:count);var offset=0
        while offset<count {
            let n=data.withUnsafeMutableBytes{p in Darwin.read(fd,p.baseAddress!.advanced(by:offset),count-offset)}
            if n<0 && errno==EINTR{continue};if n<=0{return nil};offset+=n
        };return data
    }
    static func read(_ fd:Int32)->[String:Any]? {
        guard let h=readExact(fd,4) else{return nil}
        let n=h.enumerated().reduce(0){$0 | Int($1.element)<<($1.offset*8)}
        guard n>0,n<=maxBytes,let data=readExact(fd,n) else{return nil}
        return (try? JSONSerialization.jsonObject(with:data)) as? [String:Any]
    }
    @discardableResult static func write(_ fd:Int32,_ object:[String:Any])->Bool {
        guard let data=try? JSONSerialization.data(withJSONObject:object),data.count<=maxBytes else{return false}
        var n=UInt32(data.count).littleEndian;var framed=Data(bytes:&n,count:4);framed.append(data)
        return framed.withUnsafeBytes{p in var offset=0;while offset<framed.count{let n=Darwin.write(fd,p.baseAddress!.advanced(by:offset),framed.count-offset);if n<0 && errno==EINTR{continue};if n<=0{return false};offset+=n};return true}
    }
    static func connectSocket()->Int32? {
        guard var a=address(path) else{return nil};let fd=socket(AF_UNIX,SOCK_STREAM,0)
        let ok=withUnsafePointer(to:&a){p in p.withMemoryRebound(to:sockaddr.self,capacity:1){Darwin.connect(fd,$0,socklen_t(MemoryLayout<sockaddr_un>.size))}}
        if ok != 0 {close(fd);return nil};return fd
    }
}
