// lib/wordpress.ts
// WordPress REST API client for image uploads

export interface WordPressCredentials {
  siteUrl: string;
  username: string;
  appPassword: string;
}

export interface UploadedImage {
  id: number;
  url: string;
  altText: string;
  title: string;
}

export interface WordPressPost {
  id: number;
  link: string;
  status: "publish" | "draft" | "future" | "pending";
  title: string;
}

export interface CreatePostOptions {
  title: string;
  content: string;
  status: "publish" | "draft" | "future";
  date?: string; // ISO 8601 format for scheduled posts
  featuredMediaId?: number;
  categories?: number[];
  tags?: number[];
  excerpt?: string;
  slug?: string;
  // SEO meta (for Yoast/RankMath if available)
  metaTitle?: string;
  metaDescription?: string;
}

export interface WordPressError {
  code: string;
  message: string;
}

/**
 * Creates the Basic Auth header for WordPress REST API
 */
export function createAuthHeader(credentials: WordPressCredentials): string {
  const token = Buffer.from(
    `${credentials.username}:${credentials.appPassword}`
  ).toString("base64");
  return `Basic ${token}`;
}

/**
 * Tests the WordPress connection
 */
export async function testConnection(
  credentials: WordPressCredentials
): Promise<{ success: boolean; error?: string; siteName?: string }> {
  try {
    const url = `${credentials.siteUrl.replace(/\/$/, "")}/wp-json/wp/v2/users/me`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: createAuthHeader(credentials),
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json() as WordPressError;
      return {
        success: false,
        error: error.message || `HTTP ${response.status}`,
      };
    }

    const user = await response.json();
    return {
      success: true,
      siteName: user.name || credentials.username,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Connection failed",
    };
  }
}

/**
 * Uploads an image to WordPress media library
 */
export async function uploadImage(
  credentials: WordPressCredentials,
  imageData: {
    base64: string; // Base64 encoded image data (without data:image prefix)
    filename: string;
    altText: string;
    caption?: string;
  }
): Promise<UploadedImage> {
  const url = `${credentials.siteUrl.replace(/\/$/, "")}/wp-json/wp/v2/media`;

  // Convert base64 to buffer
  const base64Data = imageData.base64.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64Data, "base64");

  // Determine content type from base64 header or default to PNG
  let contentType = "image/png";
  if (imageData.base64.startsWith("data:image/jpeg")) {
    contentType = "image/jpeg";
  } else if (imageData.base64.startsWith("data:image/webp")) {
    contentType = "image/webp";
  }

  // First upload the file
  const uploadResponse = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: createAuthHeader(credentials),
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${imageData.filename}"`,
    },
    body: imageBuffer,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json() as WordPressError;
    throw new Error(error.message || `Upload failed: HTTP ${uploadResponse.status}`);
  }

  const media = await uploadResponse.json();

  // Update the alt text and caption if needed
  if (imageData.altText || imageData.caption) {
    const updateUrl = `${url}/${media.id}`;
    await fetch(updateUrl, {
      method: "POST",
      headers: {
        Authorization: createAuthHeader(credentials),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        alt_text: imageData.altText,
        caption: imageData.caption || "",
      }),
    });
  }

  return {
    id: media.id,
    url: media.source_url || media.guid?.rendered,
    altText: imageData.altText,
    title: media.title?.rendered || imageData.filename,
  };
}

/**
 * Uploads multiple images to WordPress
 */
export async function uploadImages(
  credentials: WordPressCredentials,
  images: Array<{
    base64: string;
    filename: string;
    altText: string;
    caption?: string;
  }>
): Promise<UploadedImage[]> {
  const results: UploadedImage[] = [];

  for (const image of images) {
    try {
      const uploaded = await uploadImage(credentials, image);
      results.push(uploaded);
    } catch (error) {
      console.error(`Failed to upload ${image.filename}:`, error);
      // Continue with other images even if one fails
      results.push({
        id: 0,
        url: "", // Will be replaced with placeholder
        altText: image.altText,
        title: image.filename,
      });
    }
  }

  return results;
}

/**
 * Creates a new WordPress post
 */
export async function createPost(
  credentials: WordPressCredentials,
  options: CreatePostOptions
): Promise<WordPressPost> {
  const url = `${credentials.siteUrl.replace(/\/$/, "")}/wp-json/wp/v2/posts`;

  // Build post data
  const postData: Record<string, any> = {
    title: options.title,
    content: options.content,
    status: options.status,
  };

  // Add scheduled date if provided
  if (options.date && options.status === "future") {
    postData.date = options.date;
  }

  // Add featured image if provided
  if (options.featuredMediaId) {
    postData.featured_media = options.featuredMediaId;
  }

  // Add categories and tags
  if (options.categories && options.categories.length > 0) {
    postData.categories = options.categories;
  }
  if (options.tags && options.tags.length > 0) {
    postData.tags = options.tags;
  }

  // Add excerpt if provided
  if (options.excerpt) {
    postData.excerpt = options.excerpt;
  }

  // Add slug if provided
  if (options.slug) {
    postData.slug = options.slug;
  }

  // Try to add Yoast SEO meta if available
  if (options.metaTitle || options.metaDescription) {
    postData.meta = {
      // Yoast SEO fields
      _yoast_wpseo_title: options.metaTitle || "",
      _yoast_wpseo_metadesc: options.metaDescription || "",
      // RankMath fields (alternative)
      rank_math_title: options.metaTitle || "",
      rank_math_description: options.metaDescription || "",
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: createAuthHeader(credentials),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    const error = await response.json() as WordPressError;
    throw new Error(error.message || `Failed to create post: HTTP ${response.status}`);
  }

  const post = await response.json();

  return {
    id: post.id,
    link: post.link,
    status: post.status,
    title: post.title?.rendered || options.title,
  };
}

/**
 * Gets WordPress categories
 */
export async function getCategories(
  credentials: WordPressCredentials
): Promise<Array<{ id: number; name: string; slug: string }>> {
  const url = `${credentials.siteUrl.replace(/\/$/, "")}/wp-json/wp/v2/categories?per_page=100`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: createAuthHeader(credentials),
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    return [];
  }

  const categories = await response.json();
  return categories.map((cat: any) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
  }));
}
