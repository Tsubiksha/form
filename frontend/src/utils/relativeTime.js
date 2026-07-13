export function relativeTime(value){
  const seconds=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/1000));
  if(seconds<45)return "Just now";
  const minutes=Math.floor(seconds/60);if(minutes<60)return `${minutes} min ago`;
  const hours=Math.floor(minutes/60);if(hours<24)return `${hours} hour${hours===1?"":"s"} ago`;
  if(hours<48)return "Yesterday";
  const days=Math.floor(hours/24);if(days<30)return `${days} days ago`;
  return new Date(value).toLocaleDateString();
}
