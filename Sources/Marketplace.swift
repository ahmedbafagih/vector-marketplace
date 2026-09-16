import Cocoa
import ImageIO
import UniformTypeIdentifiers

final class Marketplace {
    let bridge=ChromeBridge()
    let resources:URL
    init(resources:URL){self.resources=resources}
    func start() throws {try bridge.start();try installHost()}
    func installHost() throws {
        let data=try Data(contentsOf:resources.appendingPathComponent("chrome-config.json"))
        let config=try JSONSerialization.jsonObject(with:data) as! [String:Any]
        let ids=config["extensionIDs"] as! [String]
        let directory=FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/Google/Chrome/NativeMessagingHosts")
        try FileManager.default.createDirectory(at:directory,withIntermediateDirectories:true)
        let host:[String:Any]=["name":"com.vector.marketplace","description":"Vector local browser connection","path":Bundle.main.bundleURL.appendingPathComponent("Contents/MacOS/VectorChromeHost").path,"type":"stdio","allowed_origins":ids.map{"chrome-extension://"+$0+"/"}]
        try JSONSerialization.data(withJSONObject:host,options:[.prettyPrinted]).write(to:directory.appendingPathComponent("com.vector.marketplace.json"),options:.atomic)
    }
    func permitted(_ value:String)->Bool {
        guard let url=URL(string:value),url.scheme=="https",["www.facebook.com","facebook.com","m.facebook.com"].contains(url.host?.lowercased() ?? "") else{return false}
        return url.path=="/marketplace" || url.path.hasPrefix("/marketplace/") || url.path.hasPrefix("/messages/t/")
    }
    func open(_ url:URL?=nil){bridge.request("open",["url":url?.absoluteString ?? "https://www.facebook.com/marketplace/"]){result in if case .failure(let error)=result{let a=NSAlert();a.messageText="Connect Chrome";a.informativeText=error.localizedDescription;a.addButton(withTitle:"OK");a.runModal()}}}
    func observe(_ completion:@escaping(Result<Any,Error>)->Void){bridge.request("observe",completion:completion)}
    func act(_ args:[String:Any],completion:@escaping(Result<Any,Error>)->Void){
        if args["action"] as? String=="navigate",!permitted(args["url"] as? String ?? ""){completion(.failure(VectorError(message:"Only Marketplace or an identified Facebook conversation can be opened.")));return}
        bridge.request("action",args,completion:completion)
    }
    static func cacheableImageURL(_ value:String)->URL? {
        guard let url=URL(string:value),url.scheme=="https",let host=url.host?.lowercased(),host=="fbcdn.net" || host.hasSuffix(".fbcdn.net") || host=="fbsbx.com" || host.hasSuffix(".fbsbx.com") else{return nil}
        return url
    }
    func jpeg(_ data:Data) throws -> Data {
        guard data.count<=8_000_000,let source=CGImageSourceCreateWithData(data as CFData,nil) else{throw VectorError(message:"Listing photo could not be read.")}
        let options:[CFString:Any]=[kCGImageSourceCreateThumbnailFromImageAlways:true,kCGImageSourceCreateThumbnailWithTransform:true,kCGImageSourceThumbnailMaxPixelSize:1600]
        guard let image=CGImageSourceCreateThumbnailAtIndex(source,0,options as CFDictionary) else{throw VectorError(message:"Could not prepare listing photo.")}
        let output=NSMutableData()
        guard let destination=CGImageDestinationCreateWithData(output,UTType.jpeg.identifier as CFString,1,nil) else{throw VectorError(message:"Could not prepare listing photo.")}
        CGImageDestinationAddImage(destination,image,[kCGImageDestinationLossyCompressionQuality:0.65] as CFDictionary)
        guard CGImageDestinationFinalize(destination),output.length<600_000 else{throw VectorError(message:"Listing photo is too large.")}
        return output as Data
    }
    func cacheImage(_ value:String,completion:@escaping(Result<Any,Error>)->Void){
        guard let url=Self.cacheableImageURL(value) else{completion(.failure(VectorError(message:"Only Facebook listing photos can be cached.")));return}
        var request=URLRequest(url:url);request.cachePolicy = .reloadIgnoringLocalCacheData;request.timeoutInterval=20
        URLSession.shared.dataTask(with:request){data,response,error in
            do{if let error{throw error};guard let http=response as? HTTPURLResponse,(200..<300).contains(http.statusCode),let data else{throw VectorError(message:"Listing photo download failed.")};let jpeg=try self.jpeg(data);completion(.success(["data":"data:image/jpeg;base64,"+jpeg.base64EncodedString()]))}catch{completion(.failure(error))}
        }.resume()
    }
    func preparePhoto(_ data:Data,completion:@escaping(Result<Any,Error>)->Void){
        do{let jpeg=try jpeg(data);bridge.request("photo",["data":"data:image/jpeg;base64,"+jpeg.base64EncodedString()],completion:completion)}catch{completion(.failure(error))}
    }
}
