# Windows native runtime

`vcruntime140.dll` is the Microsoft-signed x64 redistributable runtime from
Visual Studio's `VC/Redist/MSVC/14.51.36231/x64/Microsoft.VC145.CRT` directory.
It is deployed next to the application executable by `extraFiles` in
`electron-builder.yml`. PowerSync's `powersync_x64.dll` imports this library;
development PCs with Visual Studio can hide its absence from an installer.

- File version: `14.51.36247.0`
- SHA-256: `d1f4225df2cd877dbf130d5668a021dce3f94118455ff5ec952061c30afc9ce7`

Keep the DLL in the source checkout used for offline builds. When updating the
runtime, use the x64 **redistributable** directory of an updated Visual Studio
installation, verify Microsoft's signature, and rebuild/redeploy the MSI.
App-local libraries are serviced by shipping updated application installers.

Reference: https://learn.microsoft.com/en-us/cpp/windows/deployment-in-visual-cpp
