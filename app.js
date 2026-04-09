/**
 * Universal Code Storyteller
 * © 2026 [Anupam Shrivastava]
 * Built with Blockly (Apache 2.0) and Tree-sitter (MIT)
 */

// 1. We import the class directly from the local file
import { Parser, Language } from './web-tree-sitter.js';

let parser, workspace;
let updatedTabs = new Set();
const WASM_BASE_URL = "./";

async function init() {
    // 2. Setup Blockly
    workspace = Blockly.inject('blocklyDiv', {
        toolbox: false, 
        scrollbars: true, 
        collapse: true, 
        readOnly: false,
        move: { scrollbars: true, drag: true, wheel: true }
    });
    defineBlocks();

    try {
        // 3. Initialize using the IMPORTED 'Parser'
        // We don't check window.TreeSitter anymore because we have the module
        await Parser.init({
            locateFile(scriptName) {
                // Redirects internal search to your local renamed binary
                if (scriptName === 'tree-sitter.wasm') return 'web-tree-sitter.wasm';
                return scriptName;
            }
        });

        // 4. Create the Parser Instance using the module reference
        parser = new Parser(); 
        
        // 5. Load your default language
        await loadLanguage('javascript');
        
        console.log("🚀 Storyteller Engine Ready");
    } catch (e) {
        console.error("Engine failed to start:", e);
        const statusEl = document.getElementById('status');
        if (statusEl) {
            statusEl.innerText = "❌ Engine Error";
            statusEl.className = "status-badge error";
        }
    }
}

const languageMap = {
    'javascript': 'tree-sitter-javascript.wasm',
    'python': 'tree-sitter-python.wasm',
    'java': 'tree-sitter-java.wasm',
    'cpp': 'tree-sitter-cpp.wasm',
    'go': 'tree-sitter-go.wasm',
    'ruby': 'tree-sitter-ruby.wasm',
    'rust': 'tree-sitter-rust.wasm',
    'php': 'tree-sitter-php.wasm',
    'csharp': 'tree-sitter-c_sharp.wasm',
    'typescript': 'tree-sitter-typescript.wasm'
};

async function loadLanguage(langKey) {
    const statusEl = document.getElementById('status');
    if (statusEl) {
        statusEl.innerText = `⏳ Loading ${langKey}...`;
        statusEl.className = "status-badge loading";
    }

    try {
        const fileName = languageMap[langKey] || `tree-sitter-${langKey}.wasm`;
        const url = `${WASM_BASE_URL}${fileName}`;
        
        // FIX: Use 'Language' directly instead of 'Parser.Language'
        const loadedLang = await Language.load(url);
        
        parser.setLanguage(loadedLang);
        
        if (statusEl) {
            statusEl.innerText = `✅ ${langKey.toUpperCase()} Ready`;
            statusEl.className = "status-badge ready";
        }
    } catch (e) {
        console.error(`Could not load ${langKey}:`, e);
        if (statusEl) {
            statusEl.innerText = `❌ Missing ${langKey}.wasm`;
            statusEl.className = "status-badge error";
        }
    }
}

/**
 * UI CONTROL FUNCTIONS
 */
window.changeSourceLanguage = function(val) {
    loadLanguage(val);
    const targetSelect = document.getElementById('targetLang');
    if (targetSelect) targetSelect.value = val;
    updatedTabs.delete('tab-target');
};

window.changeTargetLanguage = function(val) {
    updatedTabs.delete('tab-target');
    if (document.getElementById('tab-target').classList.contains('active')) {
        updateSpecificTab('tab-target');
    }
};

window.openTab = function(evt, tabName) {
    const contents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < contents.length; i++) {
        contents[i].style.display = "none";
        contents[i].classList.remove("active");
    }

    const buttons = document.getElementsByClassName("tab-btn");
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].classList.remove("active");
    }

    const activeTab = document.getElementById(tabName);
    if (activeTab) {
        activeTab.style.display = "flex";
        activeTab.classList.add("active");
    }
    evt.currentTarget.classList.add("active");

    if (!updatedTabs.has(tabName)) {
        updateSpecificTab(tabName);
    }

    if (tabName === 'tab-visual') {
        setTimeout(() => Blockly.svgResize(workspace), 50);
    }
};

/**
 * THE ENGINE: COORDINATES TRANSFORMATIONS
 */
function updateSpecificTab(tabName) {
    const codeIn = document.getElementById('codeIn');
    if (!codeIn || !parser) return;

    const code = codeIn.value;
    const tree = parser.parse(code);

    switch (tabName) {
        case 'tab-pseudo':
            document.getElementById('pseudoOut').innerText = nodeToPseudocode(tree.rootNode);
            break;

        case 'tab-visual':
            workspace.clear();
            const blocks = tree.rootNode.children.map(nodeToBlocklyJSON).filter(b => b);
            Blockly.serialization.workspaces.load({ "blocks": { "blocks": blocks } }, workspace);
            break;

        case 'tab-target':
            if (!updatedTabs.has('tab-visual')) {
                updateSpecificTab('tab-visual');
            }
            generateLanguageOutput();
            break;
    }

    updatedTabs.add(tabName);
}

function generateLanguageOutput() {
    const targetLang = document.getElementById('targetLang').value;
    const targetOut = document.getElementById('targetOut');
    
    const generatorMap = {
        'javascript': javascript.javascriptGenerator,
        'typescript': javascript.javascriptGenerator,
        'python': python.pythonGenerator,
        'php': php.phpGenerator,
        'dart': dart.dartGenerator,
        'lua': lua.luaGenerator
    };

    const gen = generatorMap[targetLang];

    if (gen) {
        const code = gen.workspaceToCode(workspace);
        targetOut.innerText = code;
    } else {
        targetOut.innerHTML = `
            <div class="unsupported-msg">
                <h3>Target Generator Not Ready</h3>
                <p>We can <strong>Visualize</strong> ${targetLang}, but the <strong>Code Generator</strong> for this language is still in development.</p>
            </div>
        `;
    }
}

/**
 * BLOCK DEFINITIONS (Simplified for brevity, keep your full ones)
 */
function defineBlocks() {
    // ... [Insert your Blockly.defineBlocksWithJsonArray code here] ...
    // Note: Use the generator registration logic exactly as you had it
}

// Global listeners for input
document.getElementById('codeIn').addEventListener('input', () => {
    updatedTabs.clear(); 
    updatedTabs.add('tab-source'); 
});

// Kickoff the async init
init();
