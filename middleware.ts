
import { withAuth } from "next-auth/middleware";

export default withAuth({
    pages: {
        signIn: '/signup',
    },
});

export const config = { matcher: ["/mercurial/:path*", "/route-editor/:path*"] }
