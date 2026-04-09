import { Parser, Language } from './web-tree-sitter.js';

let parser, workspace;
let updatedTabs = new Set();
const WASM_BASE_URL = "./";

async function init() {
    // 1. Setup Blockly
    workspace = Blockly.inject('blocklyDiv', {
        toolbox: false, scrollbars: true, collapse: true, readOnly: false,
        move: { scrollbars: true, drag: true, wheel: true }
    });
    
    // 2. Initialize Tree-Sitter
    try {
        await Parser.init({
            locateFile(scriptName) {
                if (scriptName === 'tree-sitter.wasm') return 'web-tree-sitter.wasm';
                return scriptName;
            }
        });
        parser = new Parser();
        await loadLanguage('javascript');
        console.log("🚀 Engine Ready");
    } catch (e) {
        console.error("Init failed:", e);
    }
}

async function loadLanguage(langKey) {
    try {
        const url = `${WASM_BASE_URL}tree-sitter-${langKey}.wasm`;
        const lang = await Language.load(url);
        parser.setLanguage(lang);
        document.getElementById('status').innerText = `✅ ${langKey.toUpperCase()}`;
    } catch (e) {
        console.error(e);
    }
}

// Visualizer Routing
window.changeVisualizer = function(val) {
    const bDiv = document.getElementById('blocklyDiv');
    const mDiv = document.getElementById('mermaidDiv');
    bDiv.style.display = val === 'blockly' ? 'block' : 'none';
    mDiv.style.display = val === 'mermaid' ? 'block' : 'none';
    
    updatedTabs.delete('tab-visual');
    if (document.getElementById('tab-visual').classList.contains('active')) {
        updateSpecificTab('tab-visual');
    }
};

window.openTab = function(evt, tabName) {
    document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabName).style.display = 'flex';
    evt.currentTarget.classList.add('active');

    if (!updatedTabs.has(tabName)) updateSpecificTab(tabName);
    if (tabName === 'tab-visual' && document.getElementById('visualizerSelect').value === 'blockly') {
        setTimeout(() => Blockly.svgResize(workspace), 50);
    }
};

function updateSpecificTab(tabName) {
    const code = document.getElementById('codeIn').value;
    const tree = parser.parse(code);
    
    // STEP 1: Always generate Pseudocode (The Middle-man)
    const pseudo = generatePseudocode(tree.rootNode);

    if (tabName === 'tab-pseudo') {
        document.getElementById('pseudoOut').innerText = pseudo;
    } else if (tabName === 'tab-visual') {
        const mode = document.getElementById('visualizerSelect').value;
        if (mode === 'blockly') renderBlocks(pseudo);
        if (mode === 'mermaid') renderFlowchart(pseudo);
    }
    updatedTabs.add(tabName);
}

function renderBlocks(pseudo) {
    workspace.clear();
    const blocks = pseudoToBlocklyJSON(pseudo);
    Blockly.serialization.workspaces.load({ "blocks": { "blocks": blocks } }, workspace);
}

function renderFlowchart(pseudo) {
    const chart = pseudoToMermaid(pseudo);
    const div = document.getElementById('mermaidDiv');
    div.innerHTML = `<pre class="mermaid">${chart}</pre>`;
    mermaid.run({ nodes: [div] });
}

window.changeSourceLanguage = (val) => { loadLanguage(val); updatedTabs.clear(); };
document.getElementById('codeIn').addEventListener('input', () => updatedTabs.clear());

init();
