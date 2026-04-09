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
     Blockly.defineBlocksWithJsonArray([
        { 
            "type": "procedures_defnoreturn", 
            "message0": "%1 %2 %3", 
            "args0": [
                {"type": "field_label", "name": "NAME"}, 
                {"type": "input_dummy"}, 
                {"type": "input_statement", "name": "STACK"}
            ], 
            "colour": 290 
        },
        { 
            "type": "controls_if", 
            "message0": "if %1 do %2", 
            "args0": [
                {"type": "input_value", "name": "IF0"}, 
                {"type": "input_statement", "name": "DO0"}
            ], 
            "previousStatement": null, "nextStatement": null, "colour": 210 
        },
        { 
            "type": "variables_set", 
            "message0": "set %1 to %2", 
            "args0": [
                {"type": "field_input", "name": "VAR", "text": "var"}, 
                {"type": "input_value", "name": "VALUE"}
            ], 
            "previousStatement": null, "nextStatement": null, "colour": 330 
        },
        { 
            "type": "return_block", 
            "message0": "return %1", 
            "args0": [{"type": "input_value", "name": "VALUE"}],
            "previousStatement": null, "colour": 120 
        },
        { 
            "type": "text_print", 
            "message0": "%1", 
            "args0": [{"type": "input_value", "name": "TEXT"}], 
            "previousStatement": null, "nextStatement": null, "colour": 160 
        },
        { 
            "type": "text", 
            "message0": "%1", 
            "args0": [{"type": "field_input", "name": "TEXT"}], 
            "output": "String", "colour": 160 
        }
    ]);

    const unquote = (val) => val.replace(/^'|'$/g, '');
    const gens = [
        { g: javascript.javascriptGenerator, name: 'js' },
        { g: python.pythonGenerator, name: 'py' },
        { g: php.phpGenerator, name: 'php' },
        { g: lua.luaGenerator, name: 'lua' },
        { g: dart.dartGenerator, name: 'dart' }
    ];

    // Register simple blocks for ALL languages
    gens.forEach(({g}) => {
        // Handle Return
        g.forBlock['return_block'] = (block) => {
            const val = unquote(g.valueToCode(block, 'VALUE', 0) || '');
            return `return ${val};\n`;
        };
        // Handle Generic Calls/Lines
        g.forBlock['text_print'] = (block) => {
            const code = unquote(g.valueToCode(block, 'TEXT', 0) || '');
            return `${code};\n`;
        };
        // Handle Variables
        g.forBlock['variables_set'] = (block) => {
            const val = unquote(g.valueToCode(block, 'VALUE', 0) || 'null');
            const varName = block.getFieldValue('VAR');
            return g === python.pythonGenerator ? `${varName} = ${val}\n` : `let ${varName} = ${val};\n`;
        };
        // Handle Ifs
        g.forBlock['controls_if'] = (block) => {
            const cond = unquote(g.valueToCode(block, 'IF0', 0) || 'true');
            const branch = g.statementToCode(block, 'DO0');
            return `if (${cond}) {\n${branch}}\n`;
        };
    });

    // Handle Function Parameters (Logic for extracting name/params from our "Gist" label)
    gens.forEach(({g}) => {
        g.forBlock['procedures_defnoreturn'] = (block) => {
            const label = block.getFieldValue('NAME') || "FUNCTION func";
            // Label is "FUNCTION name(param1, param2) [steps]"
            const namePart = label.split(' ')[1] || "func";
            const funcName = namePart.split('(')[0];
            const params = namePart.includes('(') ? namePart.match(/\(([^)]+)\)/)[1] : "";
            
            const branch = g.statementToCode(block, 'STACK') || '  // no logic\n';
            
            if (g === python.pythonGenerator) return `def ${funcName}(${params}):\n${branch}\n`;
            if (g === dart.dartGenerator) return `void ${funcName}(${params}) {\n${branch}}\n`;
            return `function ${funcName}(${params}) {\n${branch}}\n\n`;
        };
    });
}

// Global listeners for input
document.getElementById('codeIn').addEventListener('input', () => {
    updatedTabs.clear(); 
    updatedTabs.add('tab-source'); 
});

// Kickoff the async init
init();
