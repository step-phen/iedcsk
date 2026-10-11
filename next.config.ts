import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  images: {
    // Learner photos come from the Laravel API's public storage; any host so a changed LAN IP does not break them.
    remotePatterns: [{ protocol: "http", hostname: "**", port: "8000", pathname: "/storage/**" }],
    // The system runs only on the school's local network, so the API is always on a private IP.
    dangerouslyAllowLocalIP: true,
  },

  // Any LAN IP, so phones on the school Wi-Fi keep working when this PC's IP changes.
  allowedDevOrigins: ["192.168.*.*"],

  // Silences the per-call "└─ ƒ actionName(args, result) in Nms" dev-terminal
  // log Next.js prints for every Server Action invocation.
  logging: {
    serverFunctions: false,
  },

  // Learner photos come back as /storage/... paths; proxy them to the API so they load on any host.
  // Games load their questions from a relative /api/activities/... URL, so that goes to the API too (cookies included).
  async rewrites() {
    const api = process.env.API_URL ?? "http://127.0.0.1:8000";
    return [
      { source: "/storage/:path*", destination: `${api}/storage/:path*` },
      { source: "/api/activities/:path*", destination: `${api}/api/activities/:path*` },
    ];
  },

  async redirects() {
    return [
      {
        // Strengths & Weaknesses is a tab on the Classroom Record page now.
        // Kept temporary (307) rather than 308: a permanent redirect sticks in
        // teachers' browser caches and would outlive another reshuffle.
        source: "/teacher/reports/learner-strengths",
        destination: "/teacher/reports/classroom-record?tab=strengths",
        permanent: false,
      },
      {
        // Developing Learners is a tab on the Classroom Record page now.
        source: "/teacher/reports/developing-learners",
        destination: "/teacher/reports/classroom-record?tab=developing",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
