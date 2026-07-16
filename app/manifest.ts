import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "视唱练耳学习平台",
    short_name: "视唱练耳",
    description: "面向中文学习者的私有视唱、练耳、节奏与钢琴辅助学习平台。",
    start_url: "/home?source=android",
    scope: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#312e81",
    lang: "zh-CN",
    categories: ["education", "music"],
    icons: [
      {
        src: "/icons/app-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/app-icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "开始练习",
        short_name: "练习",
        url: "/practice?source=android-shortcut",
        icons: [
          {
            src: "/icons/app-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
      {
        name: "系统课程",
        short_name: "课程",
        url: "/learn?source=android-shortcut",
        icons: [
          {
            src: "/icons/app-icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
  };
}
