// console.log("xxx");
import React, {
  CSSProperties,
  DOMAttributes,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactDOM from "react-dom";
// import loader, {Monaco} from "@monaco-editor/loader";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/basic-languages/clojure/clojure.contribution";
import wabtFn from "wabt";
// import {Wabt} from "wabt";

// import binaryen from "binaryen";
// import type * as monacoType from "monaco-editor"
// type Monaco = typeof import("monaco-editor");

// type Monaco = typeof import("monaco-editor");
// let monaco: Monaco;

type ViewProps = {
  children: React.ReactNode;
  attrs?: React.HTMLAttributes<any>;
} & React.CSSProperties;

const defaults: React.CSSProperties = {
  display: "flex",
  width: "100%",
  height: "100%",
};

function View({ children, attrs, ...otherProps }: ViewProps) {
  return (
    <div {...attrs} style={{ ...defaults, ...otherProps }}>
      {children}
    </div>
  );
}

function App() {
  return <Editor />;
}

// function useEditor() {
//   return [ref, editor];
// }

let wabt: Awaited<ReturnType<typeof wabtFn>>;

function Editor() {
  const ref = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>(
    null,
  );

  useEffect(() => {
    if (ref.current) {
      wabtFn().then(async _wabt => {
        wabt = _wabt;
        console.log('wabt ready', wabt);
        const code = `
        (module
          (func $log (import "js" "log") (param i32))
          (func (export "run")
            i32.const 42
            call $log
          )
        )`
        const wasm = wabt.parseWat("wat.wat", code, {
          exceptions: false,
          // mutableGlobals: false,
          // satFloatToInt: false,
          // signExtension: false,
          simd: false,
          threads: false,
          // multiValue: false,
          // tailCall: false,
          // bulkMemory: false,
          // referenceTypes: false,
          annotations: false,
          gc: false,
        });
        console.log('wasm:validate', wasm.validate());
        const buf = wasm.toBinary({
          log: false,
          canonicalize_lebs: false,
          relocatable: false,
          write_debug_names: false
        }).buffer;
        const ins = await WebAssembly.instantiate(buf, {
          js: {
            log: console.log
          }
        });
        (ins.instance.exports as any).run();
      });
      const editor = monaco.editor.create(ref.current, {
        theme: "vs-dark",
        lineNumbers: "off",
        minimap: {
          enabled: false,
        },
        fontSize: 15,
      });
      editor.layout();
      setEditor(editor);
    }
  }, [ref]);

  useEffect(() => {
    if (editor) {
      const model = monaco.editor.createModel(
        "(module\n  (memory 1)\n)",
        "clojure",
      );
      editor.setModel(model);
      editor.focus();
      // console.log("editor loaded");
    }
  }, [editor]);
  // if (!editor) return <div>....</div>
  return (
    <View width="100vw" height="100vh" background="#333">
      <View
        padding={3}
        boxSizing="border-box"
        display="grid"
        placeItems="center"
      >
        <div ref={ref} style={{ width: "98%", height: "99%" }} />
      </View>
    </View>
  );
}

// console.log("eeee");
ReactDOM.render(<App />, document.getElementById("root"));
