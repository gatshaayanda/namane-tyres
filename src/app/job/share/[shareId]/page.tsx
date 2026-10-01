import SharedJobView from "./view";
export default async function Page({params}:{params:Promise<{shareId:string}>}){const {shareId}=await params;return <SharedJobView shareId={shareId}/>}
