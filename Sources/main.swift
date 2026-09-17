import Cocoa
import CoreLocation
import MapKit
import WebKit
import UserNotifications

final class App: NSObject, NSApplicationDelegate, WKScriptMessageHandler, WKUIDelegate, WKNavigationDelegate, UNUserNotificationCenterDelegate {
    var window:NSWindow!;var web:WKWebView!;var store:Store!;var runtime:Runtime!;var market:Marketplace!
    let worker=DispatchQueue(label:"vector.runtime",qos:.userInitiated)
    var terminating=false
    var resources:URL {Bundle.main.resourceURL!}
    func applicationDidFinishLaunching(_ notification:Notification){
        do{
            let custom=ProcessInfo.processInfo.environment["VECTOR_DATA_DIR"]
            let directory=custom.map{URL(fileURLWithPath:$0)} ?? FileManager.default.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support/Vector")
            store=try Store(directory:directory);runtime=Runtime(directory:directory);market=Marketplace(resources:resources)
            if CommandLine.arguments.contains("--self-test") {selfTest();return}
            try market.start()
            let notifications=UNUserNotificationCenter.current();notifications.delegate=self;notifications.requestAuthorization(options:[.alert]){_,_ in}
            makeMenu()
            let config=WKWebViewConfiguration();config.userContentController.add(self,name:"vector");config.preferences.javaScriptCanOpenWindowsAutomatically=false
            config.userContentController.addUserScript(WKUserScript(source:"window.VECTOR_NATIVE=true;",injectionTime:.atDocumentStart,forMainFrameOnly:true))
            web=WKWebView(frame:.zero,configuration:config);web.uiDelegate=self;web.navigationDelegate=self
            window=NSWindow(contentRect:NSRect(x:0,y:0,width:1200,height:840),styleMask:[.titled,.closable,.miniaturizable,.resizable],backing:.buffered,defer:false)
            window.title="Vector";window.minSize=NSSize(width:640,height:540);window.contentView=web;window.isReleasedWhenClosed=false;window.center();window.makeKeyAndOrderFront(nil)
            web.loadFileURL(resources.appendingPathComponent("index.html"),allowingReadAccessTo:resources)
            NSApp.activate(ignoringOtherApps:true)
        }catch {let alert=NSAlert();alert.messageText="Vector could not start";alert.informativeText=error.localizedDescription;alert.runModal();NSApp.terminate(nil)}
    }
    func makeMenu(){
        let main=NSMenu();let appItem=NSMenuItem();let appMenu=NSMenu();appMenu.addItem(withTitle:"About Vector",action:#selector(about),keyEquivalent:"");appMenu.addItem(.separator());appMenu.addItem(withTitle:"Quit Vector",action:#selector(NSApplication.terminate(_:)),keyEquivalent:"q");appItem.submenu=appMenu;main.addItem(appItem)
        let edit=NSMenuItem();edit.title="Edit";let menu=NSMenu(title:"Edit");for (title,selector,key) in [("Undo","undo:","z"),("Cut","cut:","x"),("Copy","copy:","c"),("Paste","paste:","v"),("Select All","selectAll:","a")] {menu.addItem(withTitle:title,action:Selector(selector),keyEquivalent:key)};edit.submenu=menu;main.addItem(edit);NSApp.mainMenu=main
    }
    @objc func about(){let alert=NSAlert();alert.messageText="Vector " + (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "");alert.informativeText="Local Marketplace workspace. Your inventory is stored on this Mac.";alert.runModal()}
    func respond(_ id:String,_ result:Result<Any,Error>){
        DispatchQueue.main.async{let object:[String:Any];switch result{case .success(let value):object=["id":id,"ok":true,"value":value];case .failure(let error):object=["id":id,"ok":false,"error":error.localizedDescription]}
            if let data=try? JSONSerialization.data(withJSONObject:object,options:[.fragmentsAllowed]),let json=String(data:data,encoding:.utf8){self.web.evaluateJavaScript("window.vectorReceive(\(json))",completionHandler:nil)}
        }
    }
    func userContentController(_ userContentController:WKUserContentController,didReceive message:WKScriptMessage){
        guard message.frameInfo.isMainFrame,message.webView===web,message.frameInfo.request.url?.isFileURL==true,let body=message.body as? [String:Any],let id=body["id"] as? String,let method=body["method"] as? String else{return}
        let a=body["args"] as? [String:Any] ?? [:]
        do{switch method {
        case "load": let value=try store.load();respond(id,.success(["state":value ?? "","dataPath":store.directory.path]))
        case "save":guard let value=a["state"] as? String else{throw VectorError(message:"Missing state.")};try store.save(value);respond(id,.success(["saved":true]))
        case "backup":respond(id,.success(["path":try store.backup().path]))
        case "export":guard let value=a["text"] as? String else{throw VectorError(message:"Nothing to export.")};let panel=NSSavePanel();panel.nameFieldStringValue="vector-backup.json";panel.begin{result in if result == .OK,let url=panel.url {do{try value.write(to:url,atomically:true,encoding:.utf8);self.respond(id,.success(["saved":true]))}catch{self.respond(id,.failure(error))}}else{self.respond(id,.success(["saved":false]))}}
        case "attention":let count=max(0,a["count"] as? Int ?? 0);NSApp.dockTile.badgeLabel=count>0 ? String(count):nil;if count>0 && (a["notify"] as? Bool != false){NSApp.requestUserAttention(.informationalRequest)};respond(id,.success(["badgeUpdated":true]))
        case "notify":let title=String((a["title"] as? String ?? "Vector").prefix(80)),body=String((a["body"] as? String ?? "").prefix(240)),key=String((a["key"] as? String ?? UUID().uuidString).prefix(120));let content=UNMutableNotificationContent();content.title=title;content.body=body;content.userInfo=["itemId":a["itemId"] as? Int ?? 0,"section":a["section"] as? String ?? "Needs attention"];UNUserNotificationCenter.current().add(UNNotificationRequest(identifier:key,content:content,trigger:nil));respond(id,.success(["scheduled":true]))
        case "runtimeStatus":respond(id,.success(["Codex":runtime.executable("Codex") != nil,"Claude Code":runtime.executable("Claude Code") != nil]))
        case "infer":guard let prompt=a["prompt"] as? String,let schema=a["schema"] as? [String:Any] else{throw VectorError(message:"AI request is incomplete.")};let provider=a["provider"] as? String ?? "Codex";worker.async{do{let value=try self.runtime.infer(provider:provider,prompt:prompt,schema:schema);self.respond(id,.success(value))}catch{self.respond(id,.failure(error))}}
        case "cancel":runtime.cancel();market.bridge.cancel();respond(id,.success(["cancelled":true]))
        case "showChrome":guard let url=NSWorkspace.shared.urlForApplication(withBundleIdentifier:"com.google.Chrome") else{throw VectorError(message:"Google Chrome is not installed.")};NSWorkspace.shared.open(url);respond(id,.success(["opened":true]))
        case "openMarketplace":let value=a["url"] as? String ?? "https://www.facebook.com/marketplace/";guard market.permitted(value) else{throw VectorError(message:"Only Marketplace or an identified Facebook conversation can be opened.")};market.bridge.request("open",["url":value]){self.respond(id,$0)}
        case "chromeStatus":market.bridge.request("status"){self.respond(id,$0)}
        case "showExtension":NSWorkspace.shared.open(resources.appendingPathComponent("Extension"));respond(id,.success(["opened":true]))
        case "observe":market.observe{self.respond(id,$0)}
        case "observeInbox":market.bridge.request("observeInbox"){self.respond(id,$0)}
        case "browserAction":market.act(a){self.respond(id,$0)}
        case "cacheImage":guard let url=a["url"] as? String else{throw VectorError(message:"Listing photo URL is missing.")};market.cacheImage(url){self.respond(id,$0)}
        case "distance":guard let from=a["from"] as? String,!from.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty,let to=a["to"] as? String,!to.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty else{throw VectorError(message:"A start address and pickup location are required.")};routeDistance(from:from,to:to){self.respond(id,$0)}
        case "preparePhoto":guard let dataURI=a["data"] as? String,let comma=dataURI.firstIndex(of:","),dataURI.hasPrefix("data:image/"),let data=Data(base64Encoded:String(dataURI[dataURI.index(after:comma)...])),NSImage(data:data) != nil else{throw VectorError(message:"Attach a valid product photo first.")};market.preparePhoto(data){self.respond(id,$0)}
        case "showData":NSWorkspace.shared.open(store.directory);respond(id,.success(["opened":true]))
        default:throw VectorError(message:"Unknown app command.")
        }}catch{respond(id,.failure(error))}
    }
    func webView(_ webView:WKWebView,runOpenPanelWith parameters:WKOpenPanelParameters,initiatedByFrame frame:WKFrameInfo,completionHandler:@escaping([URL]?)->Void){let panel=NSOpenPanel();panel.allowsMultipleSelection=parameters.allowsMultipleSelection;panel.canChooseDirectories=false;panel.begin{completionHandler($0 == .OK ? panel.urls:nil)}}
    func routeDistance(from:String,to:String,completion:@escaping(Result<Any,Error>)->Void){
        geocode(from){originResult in do{let origin=try originResult.get();self.geocode(to){destinationResult in do{let destination=try destinationResult.get();let request=MKDirections.Request();request.source=MKMapItem(placemark:MKPlacemark(coordinate:origin.coordinate));request.destination=MKMapItem(placemark:MKPlacemark(coordinate:destination.coordinate));request.transportType = .automobile
                    MKDirections(request:request).calculate{response,_ in let routeKm=response?.routes.first.map{$0.distance/1000};let straightKm=origin.distance(from:destination)/1000;let km=routeKm ?? straightKm;completion(.success(["distanceKm":(km*10).rounded()/10,"method":routeKm == nil ? "straight-line" : "driving"]))}
                }catch{completion(.failure(self.locationError(error,origin:false)))}}}catch{completion(.failure(self.locationError(error,origin:true)))}}
    }
    func locationError(_ error:Error,origin:Bool)->Error {
        if error.localizedDescription=="The location identifies only a broad area."{return VectorError(message:origin ? "Your pickup start address identifies only a broad area. Add a street address in Buying settings." : "Pickup location is only a broad area. Ask for an intersection and city or a postal code.")}
        let detail=error as NSError
        let missing=(detail.domain==MKErrorDomain && detail.code==MKError.Code.placemarkNotFound.rawValue)||(detail.domain==kCLErrorDomain && detail.code==CLError.Code.geocodeFoundNoResult.rawValue)||error.localizedDescription=="The address could not be located."
        if missing{return VectorError(message:origin ? "Your pickup start address could not be found. Check the address in Buying settings." : "Pickup location could not be found. Ask the seller to clarify the location.")}
        return error
    }
    func geocode(_ address:String,completion:@escaping(Result<CLLocation,Error>)->Void){
        let accept:(CLPlacemark,Error?)->Void={mark,error in
            let postal=mark.postalCode?.replacingOccurrences(of:" ",with:"").lowercased() ?? ""
            let input=address.replacingOccurrences(of:" ",with:"").lowercased()
            let specific = !(mark.thoroughfare ?? "").isEmpty || !(mark.areasOfInterest ?? []).isEmpty || (!postal.isEmpty && input==postal)
            guard specific else {completion(.failure(VectorError(message:"The location identifies only a broad area.")));return}
            if let location=mark.location {completion(.success(location))} else {completion(.failure(error ?? VectorError(message:"The address could not be located.")))}
        }
        let coder=CLGeocoder();coder.geocodeAddressString(address){marks,error in if let mark=marks?.first{accept(mark,error)}else{completion(.failure(error ?? VectorError(message:"The address could not be located.")))}}
    }
    func userNotificationCenter(_ center:UNUserNotificationCenter,willPresent notification:UNNotification,withCompletionHandler completionHandler:@escaping(UNNotificationPresentationOptions)->Void){completionHandler([.banner])}
    func userNotificationCenter(_ center:UNUserNotificationCenter,didReceive response:UNNotificationResponse,withCompletionHandler completionHandler:@escaping()->Void){
        let info=response.notification.request.content.userInfo,itemId=info["itemId"] as? Int ?? 0,section=info["section"] as? String ?? "Needs attention"
        let data=try? JSONSerialization.data(withJSONObject:section,options:[.fragmentsAllowed])
        let sectionJSON=data.flatMap{String(data:$0,encoding:.utf8)} ?? "\"Needs attention\""
        NSApp.activate(ignoringOtherApps:true);window?.makeKeyAndOrderFront(nil)
        web?.evaluateJavaScript("window.vectorOpenNotification?.(\(itemId),\(sectionJSON))",completionHandler:nil);completionHandler()
    }
    func webView(_ webView:WKWebView,decidePolicyFor navigationAction:WKNavigationAction,decisionHandler:@escaping(WKNavigationActionPolicy)->Void){if let url=navigationAction.request.url,!url.isFileURL, navigationAction.navigationType == .linkActivated {if market.permitted(url.absoluteString){market.open(url)}else if url.scheme=="https"{NSWorkspace.shared.open(url)};decisionHandler(.cancel)}else{decisionHandler(.allow)}}
    func applicationShouldTerminateAfterLastWindowClosed(_ sender:NSApplication)->Bool{true}
    func applicationShouldTerminate(_ sender:NSApplication)->NSApplication.TerminateReply{
        if terminating||web==nil{return .terminateNow};terminating=true;runtime.cancel()
        web.evaluateJavaScript("window.vectorSnapshot ? window.vectorSnapshot() : null"){value,_ in if let text=value as? String {try? self.store.save(text)};_ = try? self.store.backup();NSApp.reply(toApplicationShouldTerminate:true)}
        return .terminateLater
    }
    func selfTest(){
        do{let test=try Store(directory:store.directory.appendingPathComponent("self-test"));try test.save("{\"inventory\":[{\"sku\":\"TEST\",\"qty\":2}]}");guard try test.load()?.contains("TEST")==true else{throw VectorError(message:"Persistence failed")};let backup=try test.backup();guard FileManager.default.fileExists(atPath:backup.path) else{throw VectorError(message:"Backup failed")};guard Marketplace.cacheableImageURL("https://scontent.example.fbcdn.net/photo.jpg") != nil,Marketplace.cacheableImageURL("https://example.com/photo.jpg") == nil else{throw VectorError(message:"Photo origin validation failed")};print("PASS: SQLite write/read, backup and photo origin validation");if let from=ProcessInfo.processInfo.environment["VECTOR_TEST_DISTANCE_FROM"],let to=ProcessInfo.processInfo.environment["VECTOR_TEST_DISTANCE_TO"]{var distanceResult:Result<Any,Error>?;routeDistance(from:from,to:to){distanceResult=$0};let deadline=Date().addingTimeInterval(30);while distanceResult == nil&&Date()<deadline{RunLoop.current.run(mode:.default,before:Date().addingTimeInterval(0.1))};guard let distanceResult else{throw VectorError(message:"Distance calculation timed out")};switch distanceResult{case .success(let value):guard let object=value as? [String:Any],let km=object["distanceKm"] as? Double,km>0 else{throw VectorError(message:"Distance calculation returned invalid data")};print("PASS: Pickup distance calculated (\(km) km)");case .failure(let error):throw error}};if let photo=ProcessInfo.processInfo.environment["VECTOR_TEST_PHOTO_URL"]{let gate=DispatchSemaphore(value:0);var photoResult:Result<Any,Error>?;market.cacheImage(photo){photoResult=$0;gate.signal()};guard gate.wait(timeout:.now()+30) == .success,let photoResult else{throw VectorError(message:"Photo cache timed out")};switch photoResult{case .success(let value):guard let object=value as? [String:Any],let data=object["data"] as? String,data.hasPrefix("data:image/jpeg;base64,") else{throw VectorError(message:"Photo cache returned invalid data")};print("PASS: Facebook photo downloaded and cached (\(data.count) characters)");case .failure(let error):throw error}};if CommandLine.arguments.contains("--test-ai"){let schema:[String:Any]=["type":"object","properties":["status":["type":"string"]],"required":["status"],"additionalProperties":false];let provider=ProcessInfo.processInfo.environment["VECTOR_TEST_PROVIDER"] ?? "Codex";let result=try runtime.infer(provider:provider,prompt:"Return status ready. Do not use tools.",schema:schema);print("PASS: AI inference \(result)")};exit(0)}catch{fputs("FAIL: \(error.localizedDescription)\n",stderr);exit(1)}
    }
}
let app=NSApplication.shared
let delegate=App();app.delegate=delegate;app.setActivationPolicy(.regular);app.run()
