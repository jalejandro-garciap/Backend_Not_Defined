export interface TikTokVideo {
    /**
     * Unique identifier for the TikTok video. Also called "item_id"
     */
    id: string;

    /**
     * UTC Unix epoch (in seconds) of when the TikTok video was posted
     */
    create_time: number;

    /**
     * A CDN link for the video's cover image. The image is static.
     * Due to trust and safety policies, the link has a TTL of 6 hours.
     */
    cover_image_url: string;

    /**
     * A shareable link for this TikTok video.
     * Note that the website behaves differently on Mobile and Desktop devices.
     */
    share_url: string;

    /**
     * The description that the creator has set for the TikTok video.
     * Max length: 150
     */
    video_description: string;

    /**
     * The duration of the TikTok video in seconds
     */
    duration: number;

    /**
     * The height of the TikTok video
     */
    height: number;

    /**
     * The width of the TikTok video
     */
    width: number;

    /**
     * The video title. Max length: 150
     */
    title: string;

    /**
     * HTML code for embedded video
     */
    embed_html: string;

    /**
     * Video embed link of tiktok.com
     */
    embed_link: string;

    /**
     * Number of likes for the video
     */
    like_count: number;

    /**
     * Number of comments on the video
     */
    comment_count: number;

    /**
     * Number of shares of the video
     */
    share_count: number;

    /**
     * Number of views of the video
     */
    view_count: number;
}