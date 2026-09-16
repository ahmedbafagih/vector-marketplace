import Foundation
import SQLite3

struct VectorError: LocalizedError { let message: String; var errorDescription: String? { message } }
final class Store {
    let directory: URL
    private var db: OpaquePointer?
    private let lock = NSRecursiveLock()
    init(directory: URL) throws {
        self.directory = directory
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
        guard sqlite3_open(directory.appendingPathComponent("vector.sqlite").path, &db) == SQLITE_OK else { throw VectorError(message: "Cannot open local database.") }
        sqlite3_busy_timeout(db, 5000)
        try execute("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS documents(key TEXT PRIMARY KEY, value TEXT NOT NULL, updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY, event TEXT NOT NULL, created TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);")
    }
    deinit { sqlite3_close(db) }
    func execute(_ sql: String) throws { lock.lock(); defer {lock.unlock()}; guard sqlite3_exec(db, sql, nil, nil, nil) == SQLITE_OK else { throw VectorError(message: String(cString: sqlite3_errmsg(db))) } }
    func save(_ text: String, key: String = "workspace") throws {
        lock.lock(); defer {lock.unlock()}
        guard let data=text.data(using:.utf8), (try? JSONSerialization.jsonObject(with:data)) != nil else { throw VectorError(message:"Invalid workspace data.") }
        var statement: OpaquePointer?
        guard sqlite3_prepare_v2(db,"INSERT INTO documents(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated=CURRENT_TIMESTAMP",-1,&statement,nil)==SQLITE_OK else { throw VectorError(message:"Cannot prepare database save.") }
        defer {sqlite3_finalize(statement)}
        let transient=unsafeBitCast(-1, to: sqlite3_destructor_type.self)
        sqlite3_bind_text(statement,1,key,-1,transient);sqlite3_bind_text(statement,2,text,-1,transient)
        guard sqlite3_step(statement)==SQLITE_DONE else {throw VectorError(message:"Local save failed.")}
    }
    func load(_ key: String = "workspace") throws -> String? {
        lock.lock();defer{lock.unlock()};var s:OpaquePointer?;defer{sqlite3_finalize(s)}
        guard sqlite3_prepare_v2(db,"SELECT value FROM documents WHERE key=?",-1,&s,nil)==SQLITE_OK else {throw VectorError(message:"Local read failed.")}
        sqlite3_bind_text(s,1,key,-1,unsafeBitCast(-1,to:sqlite3_destructor_type.self))
        return sqlite3_step(s)==SQLITE_ROW ? String(cString:sqlite3_column_text(s,0)) : nil
    }
    func backup() throws -> URL {
        let dir=directory.appendingPathComponent("Backups");try FileManager.default.createDirectory(at:dir,withIntermediateDirectories:true)
        let stamp=ISO8601DateFormatter().string(from:Date()).replacingOccurrences(of:":",with:"-")
        let url=dir.appendingPathComponent("vector-\(stamp).json")
        try (load() ?? "{}").write(to:url,atomically:true,encoding:.utf8)
        let files=try FileManager.default.contentsOfDirectory(at:dir,includingPropertiesForKeys:nil).filter{$0.pathExtension=="json"}.sorted{$0.lastPathComponent>$1.lastPathComponent}
        for file in files.dropFirst(20) {try? FileManager.default.removeItem(at:file)}
        return url
    }
}
