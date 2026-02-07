
export { default } from "next-auth/middleware"

export const config = { matcher: ["/mercurial/:path*", "/route-editor/:path*"] }
