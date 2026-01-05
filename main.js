import plugin from '../plugin.json';
import { isHTMLFile, resolvePath } from './utils.js';
import { getLivePortIfAvilable, checkServer, start_in_app_server } from './server.js';
import { createSideButton, showDefaultWindow, initUi, addBigScreenPage, updateAddressBar } from './ui.js';
import { ensureNodeDependencies } from './dependencyChecker.js'; 
import { getSettings, settingsList, onSettingsChange } from './settings.js';

const { editorManager, acode } = window;

class AcodePlugin {
    constructor() {
        this.baseUrl = null;
        this.liveServerButton = null;
        this.jsonData = {}; 
        this.currentHtmlFile = null;
        this.erudaEnabled = false;
        
        this.reloadFile = this.reloadFile.bind(this);
        this.onSwitchFile = this.onSwitchFile.bind(this); 
        this.openWindow = this.openWindow.bind(this);
        this.handleTheBackend = this.handleTheBackend.bind(this);
        this.onToggleConsole = this.onToggleConsole.bind(this);
        this.onInspectElement = this.onInspectElement.bind(this); 
    }

    async init(baseUrl) {
        this.baseUrl = baseUrl;
        initUi(plugin.id, baseUrl, this.onToggleConsole, this.onInspectElement);
        acode.addIcon('liveserver', `${this.baseUrl}icon.png`);
        
        this.liveServerButton = createSideButton(this.openWindow);
        this.onSwitchFile(); 

        editorManager.on('switch-file', this.onSwitchFile);
        editorManager.on('save-file', this.reloadFile);
    }

    onSwitchFile() {
        const isHtml = isHTMLFile();
        if (isHtml) {
            this.liveServerButton?.show();
        } else {
            this.liveServerButton?.hide();
        }
    }

    async openWindow() {
        const depsOk = await ensureNodeDependencies(false);
        if (!depsOk) return; 

        const htmlFile = editorManager.activeFile;
        await this.handleTheBackend(htmlFile);
    }

    async reloadFile() {
        if (!isHTMLFile()) return;
        const settings = getSettings();
        if (!settings.previewOnSave) return; 

        await new Promise(resolve => setTimeout(resolve, 150)); 
        await this.handleTheBackend();
    }
    
    async onToggleConsole() {
        this.erudaEnabled = !this.erudaEnabled;
        window.toast(this.erudaEnabled ? "Console Enabled" : "Console Disabled", 1000);
        
        // Console toggle logic is now handled inside ui.js or via reloading
        // We just re-trigger backend handle to refresh view with injection if needed
        // But for Termux mode, UI handles injection manually via copy script.
        this.handleTheBackend(); 
    }

    onInspectElement(selector) {
        const editor = editorManager.editor;
        if (!editor) return;
        let simpleSelector = selector.split(' > ').pop().split(':').shift();
        if (!simpleSelector.startsWith('.') && !simpleSelector.startsWith('#')) simpleSelector = selector;
        window.toast(`Inspecting: ${simpleSelector}`, 2000);
        editor.find(simpleSelector, { wrap: true, caseSensitive: false, regExp: false });
        if (!editor.getSelectionRange().isEmpty()) editor.focus();
    }

    // async handleTheBackend(fileToProcess) {
    //     console.log('handleTheBackend :_________ [start]');
    //     const settings = getSettings();
        
    //     // --- 1. PREVIEW MODE CHECK ---
    //     // যদি ইউজার প্রিভিউ মোডে থাকেন, তবে ইন্টারনাল সার্ভার লজিক স্কিপ করুন
    //     // এবং UI কে আপডেট করতে বলুন (যাতে পাথ চেঞ্জ হলে কমান্ড আপডেট হয়)
    //     const lastMode = localStorage.getItem('suger_last_mode');
    //     if (lastMode === 'preview') {
    //         addBigScreenPage(); // এটি UI কে বলবে বর্তমান মোড অনুযায়ী পেজ রেন্ডার করতে
    //         return; 
    //     }

    //     // --- 2. INTERNAL SERVER LOGIC ---
    //     let fileToUse;
    //     if (fileToProcess) fileToUse = fileToProcess;
    //     else if (editorManager.activeFile.id === plugin.id) fileToUse = this.currentHtmlFile; 
    //     else fileToUse = editorManager.activeFile;

    //     if (fileToUse && fileToUse.id !== plugin.id) this.currentHtmlFile = fileToUse;
    //     if (!fileToUse) return;
      
    //     const ActiveFile = fileToUse;
    //     if (!ActiveFile.uri && !ActiveFile.cacheFile) return;
    //     if (ActiveFile.cacheFile && !ActiveFile.uri) {
    //         window.toast('Please save the file to use Live Server.', 3000);
    //         return;
    //     }

    //     const originalPath = resolvePath(ActiveFile.uri);
    //     if (!originalPath) {
    //         window.toast('Could not resolve file path.');
    //         return;
    //     }
        
    //     this.jsonData.path = originalPath;
    //     this.jsonData.fileName = ActiveFile.uri.split('/').pop();
    //     this.jsonData.eruda = this.erudaEnabled; 
    //     this.jsonData.zoom = settings.enablePinchToZoom;
    //     this.jsonData.consoleType = settings.consoleType || 'suger'; 
        
    //     const userPort = parseInt(settings.serverPort) || 1024;
        
    //     try {
    //         if (!this.jsonData.port) {
    //             this.jsonData.port = await getLivePortIfAvilable(userPort);
    //         }

    //         if (this.jsonData.port) {
    //             const serverOk = await checkServer(this.jsonData);
                
    //             if (serverOk) {
    //                 localStorage.setItem('suger_active_server_port', this.jsonData.port);
    //                 localStorage.setItem('suger_last_mode', 'server');

    //                 const cleanUrl = `http://localhost:${this.jsonData.port}/`;

    //                 // ✅ FIX: সরাসরি iframe.src পরিবর্তন করা বন্ধ করা হলো
    //                 // addBigScreenPage এর মাধ্যমে URL পাঠানো হচ্ছে
    //                 addBigScreenPage(cleanUrl); 
                    
    //             } else {
    //                 delete this.jsonData.port;
    //                 showDefaultWindow(); 
    //             }
    //         } else {
    //             showDefaultWindow(); 
    //             if (window.BuildInfo.versionCode >= 963) {
    //                 await start_in_app_server(ActiveFile.id, () => {
    //                     window.toast(`Server Started on port ${userPort}!`, 2000);
    //                     this.handleTheBackend(ActiveFile); 
    //                 }, userPort);
    //             } else {
    //                 window.toast("Acode update required for auto-start feature.", 4000);
    //             }
    //         }
    //     } catch (error) {
    //         console.error("Error:", error);
    //         showDefaultWindow();
    //     }
    //     console.log('handleTheBackend :_________ [finished]');
    // }
    
    async handleTheBackend(fileToProcess) {
        console.log('handleTheBackend :_________ [start]');
        const settings = getSettings();
        
        // --- PREVIEW MODE CHECK ---
        const lastMode = localStorage.getItem('suger_last_mode');
        if (lastMode === 'preview') {
            addBigScreenPage(); 
            return; 
        }

        // --- INTERNAL SERVER LOGIC ---
        let fileToUse;
        if (fileToProcess) fileToUse = fileToProcess;
        else if (editorManager.activeFile.id === plugin.id) fileToUse = this.currentHtmlFile; 
        else fileToUse = editorManager.activeFile;

        if (fileToUse && fileToUse.id !== plugin.id) this.currentHtmlFile = fileToUse;
        if (!fileToUse) return;
      
        const ActiveFile = fileToUse;
        if (!ActiveFile.uri && !ActiveFile.cacheFile) return;

        // পাথ রেজোলিউশন
        const originalPath = resolvePath(ActiveFile.uri);
        if (!originalPath) {
            window.toast('Could not resolve file path.');
            return;
        }
        
        // ✅ DEBUG LOG
        console.log("Resolved Path for Server:", originalPath);

        this.jsonData.path = originalPath;
        this.jsonData.fileName = ActiveFile.uri.split('/').pop();
        this.jsonData.eruda = this.erudaEnabled; 
        this.jsonData.zoom = settings.enablePinchToZoom;
        this.jsonData.consoleType = settings.consoleType || 'suger'; 
        
        const userPort = parseInt(settings.serverPort) || 1024;
        
        try {
            // ১. চেক করুন সার্ভার অলরেডি চলছে কিনা
            if (!this.jsonData.port) {
                this.jsonData.port = await getLivePortIfAvilable(userPort);
            }

            if (this.jsonData.port) {
                // ২. সার্ভার চললে কনফিগারেশন প্যাচ করুন (/setup)
                const serverOk = await checkServer(this.jsonData);
                
                if (serverOk) {
                    localStorage.setItem('suger_active_server_port', this.jsonData.port);
                    localStorage.setItem('suger_last_mode', 'server');
                    const cleanUrl = `http://localhost:${this.jsonData.port}/`;
                    addBigScreenPage(cleanUrl); 
                } else {
                    // পোর্ট বিজি কিন্তু আমাদের সার্ভার নয়
                    delete this.jsonData.port;
                    showDefaultWindow(); 
                }
            } else {
                // ৩. সার্ভার চলছে না, তাই নতুন করে স্টার্ট করুন
                showDefaultWindow(); 
                
                // ✅ FIX: BuildInfo চেক বাদ দিয়ে সরাসরি চেষ্টা করা হচ্ছে (অথবা ওয়ার্নিং সহ)
                // Acode Free ভার্সনে অনেক সময় versionCode কম দেখাতে পারে বা API ভিন্ন হতে পারে
                
                window.toast(`Starting server on port ${userPort}...`, 2000);
                
                await start_in_app_server(ActiveFile.id, () => {
                    window.toast(`Server Ready!`, 2000);
                    // সার্ভার রেডি হলে আবার এই ফাংশনটি কল করুন যাতে UI লোড হয়
                    this.handleTheBackend(ActiveFile); 
                }, userPort);
            }
        } catch (error) {
            console.error("Error in handleTheBackend:", error);
            showDefaultWindow();
        }
        console.log('handleTheBackend :_________ [finished]');
    }

    async destroy() {
        this.liveServerButton?.hide();
        this.liveServerButton = undefined;
        editorManager.off('switch-file', this.onSwitchFile);
        editorManager.off('save-file', this.reloadFile);
        const bigScreen = editorManager.getFile(plugin.id, 'id');
        if (bigScreen) bigScreen.remove(true);
    }
}

if (window.acode) {
    const acodePlugin = new AcodePlugin();
    acode.setPluginInit(plugin.id, async (baseUrl) => {
        if (!baseUrl.endsWith('/')) baseUrl += '/';
        await acodePlugin.init(baseUrl);
    }, { list: settingsList, cb: onSettingsChange });
    acode.setPluginUnmount(plugin.id, () => { acodePlugin.destroy(); 
    });
}