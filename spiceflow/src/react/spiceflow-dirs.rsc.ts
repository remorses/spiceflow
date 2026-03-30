// RSC-environment directory resolver. Re-exports build-resolved paths from
// the Vite virtual module. Resolved via package.json #spiceflow-dirs import
// map under the "react-server" condition — only runs inside Vite RSC builds.

export { publicDir, distDir } from 'virtual:spiceflow-dirs'
