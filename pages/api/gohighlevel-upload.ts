// pages/api/gohighlevel-upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";

interface GHLCredentials {
  apiToken: string;
  locationId: string;
  blogId?: string;
}

interface GHLBlog {
  id: string;
  name: string;
  description?: string;
}

interface GHLCategory {
  id: string;
  name: string;
  slug: string;
}

interface GHLAuthor {
  id: string;
  name: string;
}

interface GHLPostData {
  title: string;
  content: string;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  published?: boolean;
  categoryIds?: string[];
  tags?: string[];
  featuredImage?: string;
  authorId?: string;
}

interface GHLResponse {
  success: boolean;
  error?: string;
  blogs?: GHLBlog[];
  categories?: GHLCategory[];
  authors?: GHLAuthor[];
  post?: {
    id: string;
    url: string;
    status: string;
  };
  siteName?: string;
  imageUrl?: string;
}

const GHL_API_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

async function ghlFetch(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    Version: GHL_VERSION,
    "Content-Type": "application/json",
    ...options.headers,
  };

  return fetch(`${GHL_API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GHLResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  // Auth check
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { action, credentials, post, imageBase64, filename } = req.body;

  if (!credentials?.apiToken) {
    return res.status(400).json({ success: false, error: "API token required" });
  }

  try {
    switch (action) {
      case "test": {
        // Test connection by fetching blogs
        if (!credentials.locationId) {
          return res.status(400).json({ success: false, error: "Location ID required" });
        }

        const response = await ghlFetch(
          `/blogs?locationId=${credentials.locationId}`,
          credentials.apiToken
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("GHL test failed:", response.status, errorText);
          return res.status(response.status).json({
            success: false,
            error: `Connection failed: ${response.status} - ${errorText}`,
          });
        }

        const data = await response.json();
        return res.status(200).json({
          success: true,
          blogs: data.blogs || [],
          siteName: data.blogs?.[0]?.name || "GoHighLevel Blog",
        });
      }

      case "getBlogs": {
        if (!credentials.locationId) {
          return res.status(400).json({ success: false, error: "Location ID required" });
        }

        const response = await ghlFetch(
          `/blogs?locationId=${credentials.locationId}`,
          credentials.apiToken
        );

        if (!response.ok) {
          return res.status(response.status).json({
            success: false,
            error: "Failed to fetch blogs",
          });
        }

        const data = await response.json();
        return res.status(200).json({
          success: true,
          blogs: data.blogs || [],
        });
      }

      case "getCategories": {
        if (!credentials.blogId) {
          return res.status(400).json({ success: false, error: "Blog ID required" });
        }

        const response = await ghlFetch(
          `/blogs/${credentials.blogId}/categories`,
          credentials.apiToken
        );

        if (!response.ok) {
          return res.status(200).json({
            success: true,
            categories: [], // Return empty if no categories
          });
        }

        const data = await response.json();
        return res.status(200).json({
          success: true,
          categories: data.categories || [],
        });
      }

      case "getAuthors": {
        if (!credentials.blogId) {
          return res.status(400).json({ success: false, error: "Blog ID required" });
        }

        const response = await ghlFetch(
          `/blogs/${credentials.blogId}/authors`,
          credentials.apiToken
        );

        if (!response.ok) {
          return res.status(200).json({
            success: true,
            authors: [],
          });
        }

        const data = await response.json();
        return res.status(200).json({
          success: true,
          authors: data.authors || [],
        });
      }

      case "uploadImage": {
        // GHL doesn't have a direct media upload API like WordPress
        // Images need to be hosted externally and referenced by URL
        // For now, return the base64 as a data URL or suggest external hosting
        if (!imageBase64) {
          return res.status(400).json({ success: false, error: "Image data required" });
        }

        // Return base64 as data URL - GHL will need externally hosted images
        // In production, you'd upload to S3, Cloudinary, etc.
        return res.status(200).json({
          success: true,
          imageUrl: `data:image/png;base64,${imageBase64}`,
        });
      }

      case "createPost": {
        if (!credentials.blogId) {
          return res.status(400).json({ success: false, error: "Blog ID required" });
        }

        const postData = post as GHLPostData;
        if (!postData?.title || !postData?.content) {
          return res.status(400).json({ success: false, error: "Title and content required" });
        }

        // Generate slug from title if not provided
        const slug = postData.slug || postData.title
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .substring(0, 100);

        const requestBody = {
          blogId: credentials.blogId,
          title: postData.title,
          slug,
          content: postData.content,
          rawHTML: postData.content, // GHL uses rawHTML for full HTML content
          metaTitle: postData.metaTitle || postData.title,
          metaDescription: postData.metaDescription || "",
          published: postData.published ?? false,
          categories: postData.categoryIds || [],
          tags: postData.tags || [],
          ...(postData.featuredImage && { featuredImage: postData.featuredImage }),
          ...(postData.authorId && { authorId: postData.authorId }),
        };

        console.log("Creating GHL post:", JSON.stringify(requestBody, null, 2));

        const response = await ghlFetch(
          "/blogs/posts",
          credentials.apiToken,
          {
            method: "POST",
            body: JSON.stringify(requestBody),
          }
        );

        const responseText = await response.text();
        console.log("GHL response:", response.status, responseText);

        if (!response.ok) {
          return res.status(response.status).json({
            success: false,
            error: `Failed to create post: ${responseText}`,
          });
        }

        let data;
        try {
          data = JSON.parse(responseText);
        } catch {
          data = { id: "unknown" };
        }

        // Construct the post URL (GHL format)
        // The actual URL depends on the blog's custom domain
        const postUrl = data.url || `https://app.kynexpro.com/blog/${slug}`;

        return res.status(200).json({
          success: true,
          post: {
            id: data.id || data.postId,
            url: postUrl,
            status: postData.published ? "published" : "draft",
          },
        });
      }

      default:
        return res.status(400).json({ success: false, error: "Invalid action" });
    }
  } catch (error) {
    console.error("GHL API error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
};
