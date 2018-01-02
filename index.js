const electron = require('electron')
const path = require('path')
const fs = require('fs')
const CryptoJS = require('crypto-js')

// Renderer process has to get `app` module via `remote`, whereas the main process can get it directly
const userDataPath = (electron.app || electron.remote.app).getPath('userData')

class Store {
    constructor(options = {}) {
        this.name = options.name || 'config'
        // We'll use the `configName` property to set the file name and path.join to bring it all together as a string
        this.path = path.join((options.path || userDataPath), this.name + '.json')
        
        this.defaults = options.defaults || {}

        this.encryptionKey = options.encryptionKey

        this.useAsIntegrityCheck = options.useAsIntegrityCheck || false
        
        this.saveToDiskErrorHandler = options.saveToDiskErrorHandler || function() {}

        this.decryptErrorHandler = options.decryptErrorHandler || function() {}
        
        this.data = this.parseDataFile()
        // Only proxify if data file is returned correctly
        if (typeof this.data === 'object') {
            this.data = this.recursiveProxy(this.data, this)
        }
        else {
            console.log("store.data must be an object. Save properties to store.data")
        }
    }
    // The function needs these arguments to keep track of where it is in the loop yet not lose the main store object
    recursiveProxy(currentObj, storeObj){
        // If obj has nested objects (or arrays???), loop
        Object.keys(currentObj).forEach((prop) => {
            if(typeof currentObj[prop] === 'object') {
                currentObj[prop] = this.recursiveProxy(currentObj[prop], storeObj)
            }
        })
        // Possibly change to automatically go to the data object
        // Would have to create a method for changing store properties
        return new Proxy(currentObj, {
            set: function(target, prop, value, receiver) {
                // TODO deal with array functions that always return falsy, which causes the proxy to throw a typeError. (I.e. Array.push() )
                // Everything still works though
                
                // Proxify newly set objects
                if(typeof value === "object"){
                    value = storeObj.recursiveProxy(value, storeObj)
                }
                target[prop] = value
               storeObj.save()
            },
            deleteProperty: function(target, prop) {
                if (prop in target){
                    // JS Linter throws a warning when using "delete" in strict mode
                    delete target[prop]
                    storeObj.save()
                    return true
                }
                else {
                    return false
                }
            }
        })
    }
    backup(location) {
        let mainLocation = this.path
        this.path = path.join(location, this.name + '.json')
        this.save()
        this.path = mainLocation
    }
    changePassword(newPass) {
        this.encryptionKey = newPass
        this.save()
    }
    changeSaveLocation(newPath, newName) {
        if(newName) {
            this.name = newName
        }
        this.path = path.join((options.path || userDataPath), this.name + '.json')
        
        this.save()
    }
    clear() {
        this.data = {}
        this.save()
    }
    // Atomically save to disk
    save() {
        let json = JSON.stringify(this.data)
        if(this.encryptionKey) {
            json = encrypt(json, this.encryptionKey)
        }
        atomicWrite(this.path, json, this.saveToDiskErrorHandler)
    }
    reset() {
        this.data = this.defaults
        this.save()
    }
    openInEditor() {
		electron.shell.openItem(this.path);
    }
    parseDataFile() {
        // Try/catch it in case the file doesn't exist yet, such as on the first application run.
        // Try/catch also allows dealing with encrypted stores whether not yet initialized or have an incorrect password entered.
        try {
            let file = fs.readFileSync(this.path)
            if (!this.encryptionKey) {
                return JSON.parse(file)
            }
            else {
                return JSON.parse(decrypt(file, this.encryptionKey))
            }
        } catch(err) {
            // Error number for "ENOENT: No such file or directory"
            if(err.errno === -4058){
                return this.defaults
            }
            // Simply using encryption as an integrity check. Probably the file is corrupt
            if(this.useAsIntegrityCheck){
                return this.defaults
            }
            // Otherwise assume incorrect password was entered
            else {
                this.decryptErrorHandler(err)
                return false
            }
        }
    }
}

// expose the class
module.exports = Store

// Functions
function encrypt(data, encryptionKey) {
    return CryptoJS.AES.encrypt(data, encryptionKey)
}
function decrypt(data, encryptionKey) {
    // Stringify encrypted data buffer
    let stringified = data.toString()
    let decrypted = CryptoJS.AES.decrypt(stringified, encryptionKey)
    return decrypted.toString(CryptoJS.enc.Utf8)
}
function atomicWrite(path, data, cb){
    cb = cb || function(){}
    let tempFileName = path + '.tmp'
    let file = fs.writeFile(tempFileName, data, (err) => {
        if(err){
            cb(err)
        }
        fs.rename(tempFileName, path, (err) => {
            if(err) {
                cb(err)
            }
            return true
        })
    })
}