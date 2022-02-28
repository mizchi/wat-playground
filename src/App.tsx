import React, { useMemo, useState } from "react";
import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/basic-languages/clojure/clojure.contribution";

import { compile, setup } from "./wasm";

type ViewProps = {
  tagName?: string;
  children?: React.ReactNode;
  attrs?: React.HTMLAttributes<any>;
} & React.CSSProperties & React.HTMLAttributes<any>;

const defaults: React.CSSProperties = {
  display: "flex",
  width: "100%",
  height: "100%",
};

const elementKeys = new Set(Reflect.ownKeys(HTMLElement.prototype));

function View({ children, attrs, ...otherProps }: ViewProps) {
  for (const key of Reflect.ownKeys(otherProps)) {
    if (elementKeys.has((key as string).toLowerCase())) {
      attrs = { ...attrs, [key]: otherProps[key] };
    }
  }
  return (
    <div {...attrs} style={{ ...defaults, ...otherProps }}>
      {children}
    </div>
  );
}

const code = `(module
  (import "js" "print" (func $print (param i32)))
  (import "js" "print_f32" (func $print_f32 (param f32)))
  (import "js" "rand" (func $rand (result f32)))

  (func (export "_start")
    ;; call imported print
    i32.const 42
    call $print

    ;; S-expression style
    (call $print
      (i32.add
        (i32.const 1)
        (i32.const 2)
      )
    )

    (call $print_f32 (call $rand))
  )
)
`;

const isMac = navigator.userAgent.indexOf("Macintosh") > -1;

export function Editor() {
  const ref = useRef<HTMLDivElement>(null);
  const [output, setOutput] = useState("");
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor>(
    null,
  );

  useEffect(() => {
    if (ref.current) {
      setup();
      const editor = monaco.editor.create(ref.current, {
        theme: "vs-dark",
        lineNumbers: "off",
        minimap: {
          enabled: false,
        },
        fontSize: 15,
      });
      const ob = new ResizeObserver((_entries) => {
        editor.layout();
      });
      ob.observe(ref.current);
      editor.layout();
      setEditor(editor);
    }
  }, [ref]);

  const run = useMemo(() => {
    return async (code: string = editor.getValue()) => {
      setOutput("");
      let result = "";
      const imports = {
        js: {
          rand: Math.random,
          print(i: any) {
            result += `[print] ${i}\n`;
          },
          print_f32(i: any) {
            result += `[print] ${i}\n`;
          },
        },
      };
      const mod = await compile(code, imports);
      // @ts-ignore
      mod.instance.exports._start();
      setOutput(result);
    };
  }, [editor, setOutput]);

  useEffect(() => {
    if (editor) {
      const model = monaco.editor.createModel(
        code,
        "clojure",
      );
      editor.setModel(model);
      editor.focus();
      editor.addAction({
        // An unique identifier of the contributed action.
        id: "my-unique-id",
        label: "Run",
        keybindings: [
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyR,
        ],
        precondition: null,
        keybindingContext: null,
        contextMenuGroupId: "navigation",
        contextMenuOrder: 1.5,
        run(_ed) {
          run(model.getValue());
        },
      });
    }
  }, [editor]);
  return (
    <View width="100vw" height="100vh" background="#333">
      {/* Editor */}
      <View
        padding={1}
        boxSizing="border-box"
        display="grid"
        placeItems="center"
        flex={1}
      >
        <div ref={ref} style={{ width: "98%", height: "99%" }} />
      </View>

      {/* Preview */}
      <View
        padding={3}
        boxSizing="border-box"
        display="grid"
        placeItems="center"
        flex={1}
      >
        <View background="#222" color="#ccc" flexDirection="column">
          <View
            height={30}
            width="140px"
            display="grid"
            placeItems="center"
            padding="5px"
            background="#ccc"
            color="black"
            borderRadius="8px"
            cursor="pointer"
            onClick={() => run()}
          >
            Run
            {isMac ? "(Cmd + R)" : "(Ctrl + R)"}
          </View>
          <hr style={{ width: "100%", height: "1px" }} />
          <View
            flex={1}
            fontFamily="monospace"
            padding="10px"
            boxSizing="border-box"
          >
            <pre>
              <code>{output}</code>
            </pre>
          </View>
        </View>
      </View>
    </View>
  );
}
