/// <reference types="vite/client" />

// SVG imports → URL string (Vite default behaviour)
declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.svg?raw' {
  const content: string
  export default content
}

declare module '*.svg?url' {
  const src: string
  export default src
}
