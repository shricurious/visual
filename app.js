/**
 * Universal Code Storyteller
 * © 2026 [Anupam Shrivastava]
 * Built with Blockly (Apache 2.0) and Tree-sitter (MIT)
 */

let parser, workspace;
let updatedTabs = new Set();
const WASM_BASE_URL = "https://unpkg.com/@emmetio/tree-sitter-languages/wasm/";

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
    statusEl.innerText = `⏳ Loading ${langKey}...`;

    try {
        const url = WASM_BASE_URL + languageMap[langKey];
        
        // Use 'anonymous' credentials mode to satisfy strict CDN policies
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit' 
        });

        if (!response.ok) throw new Error(`Could not reach CDN: ${response.status}`);
        
        const buffer = await response.arrayBuffer();
        // Load the binary into the Tree-sitter parser
        const Language = await TreeSitter.Language.load(new Uint8Array(buffer));
        
        parser.setLanguage(Language);
        
        statusEl.innerText = `✅ ${langKey.toUpperCase()} Ready`;
        statusEl.className = "status-badge ready";
        updatedTabs.clear(); 
    } catch (e) {
        console.error(`CORS Fail on ${langKey}:`, e);
        statusEl.innerText = `❌ CDN Blocked: ${langKey}`;
        statusEl.className = "status-badge error";
    }
}

function changeSourceLanguage(val) {
    // 1. Load the new Parser engine
    loadLanguage(val);
    
    // 2. Default the Target Language to match Source
    const targetSelect = document.getElementById('targetLang');
    targetSelect.value = val;
    
    // 3. Reset the target tab cache
    updatedTabs.delete('tab-target');
}

function changeTargetLanguage(val) {
    // Simply clear the cache so the next click/update generates the new language
    updatedTabs.delete('tab-target');
    
    // If we are already looking at the target tab, update it immediately
    if (document.getElementById('tab-target').classList.contains('active')) {
        updateSpecificTab('tab-target');
    }
}

/**
 * INITIALIZATION
 */
async function init() {
    // 1. Setup Blockly (Keep your existing code)
    workspace = Blockly.inject('blocklyDiv', {
        toolbox: false, scrollbars: true, collapse: true, readOnly: false
    });
    defineBlocks();

    try {
        // 2. Point Core WASM to JSDelivr's reliable CDN
        await TreeSitter.init({
            locateFile(scriptName) {
                return `https://cdn.jsdelivr.net/npm/web-tree-sitter@0.20.3/${scriptName}`;
            }
        });

        parser = new TreeSitter();
        
        // 3. Load your default language
        await loadLanguage('javascript');

    } catch (e) {
        console.error("Tree-sitter Engine Failed:", e);
        document.getElementById('status').innerText = "❌ Engine Error (CORS)";
    }
}

/**
 * REACTIVE LOGIC
 * Reset tracking when the user changes the source code
 */
document.getElementById('codeIn').addEventListener('input', () => {
    updatedTabs.clear(); 
    updatedTabs.add('tab-source'); 
});

/**
 * TAB NAVIGATION (LAZY LOAD)
 */
function openTab(evt, tabName) {
    // UI Switch: Hide all, show one
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

    // Logic: Only update if the tab is "Dirty"
    if (!updatedTabs.has(tabName)) {
        updateSpecificTab(tabName);
    }

    // Refresh Blockly layout if visual tab is opened
    if (tabName === 'tab-visual') {
        setTimeout(() => Blockly.svgResize(workspace), 50);
    }
}

/**
 * THE ENGINE: COORDINATES TRANSFORMATIONS
 */
function updateSpecificTab(tabName) {
    const code = document.getElementById('codeIn').value;
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

        case 'tab-js':
        case 'tab-py':
        case 'tab-php':
        case 'tab-lua':
        case 'tab-dart':
            // Dependency Check: Languages require the Visual (Blockly) model first
            if (!updatedTabs.has('tab-visual')) {
                updateSpecificTab('tab-visual');
            }
            generateLanguageOutput(tabName);
            break;
    }

    updatedTabs.add(tabName);
    console.log(`Updated Tab: ${tabName}`);
}

/**
 * GENERATORS: BLOCKS -> CLEAN CODE
 */
function generateLanguageOutput() {
    const targetLang = document.getElementById('targetLang').value;
    const targetOut = document.getElementById('targetOut');
    
    // 1. Map of supported generators
    const generatorMap = {
        'javascript': javascript.javascriptGenerator,
        'typescript': javascript.javascriptGenerator, // Logical mapping
        'python': python.pythonGenerator,
        'php': php.phpGenerator,
        'dart': dart.dartGenerator,
        'lua': lua.luaGenerator
    };

    const gen = generatorMap[targetLang];

    // 2. The Guard Logic
    if (gen) {
        const code = gen.workspaceToCode(workspace);
        targetOut.innerText = code;
    } else {
        // Fallback for languages we can PARSE but not yet WRITE
        targetOut.innerHTML = `
            <div class="unsupported-msg">
                <h3>Target Generator Not Ready</h3>
                <p>We can <strong>Visualize</strong> ${targetLang}, but the <strong>Code Generator</strong> for this language is still in development.</p>
                <p>Try selecting <strong>JavaScript</strong> or <strong>Python</strong> as the Target to see the logic structure.</p>
            </div>
        `;
    }
}

/**
 * BLOCK DEFINITIONS & REVERSE MAPPING
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

// Kickoff
init();
