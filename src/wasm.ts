import wabtFn from "wabt";

let _wabt: Awaited<ReturnType<typeof wabtFn>>;

export async function setup() {
  _wabt = await wabtFn()
}

export async function compile(code: string, imports: any): Promise<WebAssembly.Module> {
  if (!_wabt) throw new Error("wabt not initialized");
  const wasm = _wabt.parseWat("main.wat", code, {
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
  // console.log('wasm:validate', wasm.validate());
  const buf = wasm.toBinary({
    log: false,
    canonicalize_lebs: false,
    relocatable: false,
    write_debug_names: false
  }).buffer;
  return await WebAssembly.instantiate(buf, imports);
}