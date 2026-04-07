interface VideoInfoProps {
  video: {
    title: string;
    channelTitle: string;
    thumbnail: string;
    viewCount: string;
    commentCount: string;
  };
  totalAnalyzed: number;
}

const VideoInfo = ({ video, totalAnalyzed }: VideoInfoProps) => (
  <div className="flex gap-4 items-start">
    <img src={video.thumbnail} alt={video.title} className="w-40 rounded-lg object-cover" />
    <div className="space-y-1">
      <h2 className="font-semibold text-foreground text-lg leading-tight">{video.title}</h2>
      <p className="text-sm text-muted-foreground">{video.channelTitle}</p>
      <div className="flex gap-4 text-xs text-muted-foreground mt-2">
        <span>{Number(video.viewCount).toLocaleString()} views</span>
        <span>{Number(video.commentCount).toLocaleString()} total comments</span>
        <span className="text-primary font-medium">{totalAnalyzed} analyzed</span>
      </div>
    </div>
  </div>
);

export default VideoInfo;
