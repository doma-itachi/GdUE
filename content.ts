import { resolve } from "path";
import type { PlasmoCSConfig } from "plasmo";
export const config: PlasmoCSConfig={
    matches: ["*://drive.google.com/drive/*"],
    all_frames: true
};

class PdfViewerManager{
    private static readonly DocumentSelector=".a-b-Xa-lc.a-b-lc.a-b-lc-pc";//PDFビューアのラッパー要素。スクロールに使う。
    private static readonly ImageSelector="[role=document] img";
    private static readonly FileNameSelector=".a-b-K-T.a-b-cg-Zf";
    private static readonly TotalPageSelector=".a-b-La-yc-Hh";

    public static getTotalPage(): number|null{
        try{
            return Number.parseInt(document.querySelector(PdfViewerManager.TotalPageSelector).textContent);
        }
        catch{
            return null;
        }
    }

    public static getFileName(): string|null{
        try{
            return document.querySelector(PdfViewerManager.FileNameSelector).textContent;
        }
        catch{
            return null;
        }
    }

    public static async scrollToEOF(){
        const frameSpeed=400;
        const waitTime_ms=300;
        let viewer=document.querySelector(PdfViewerManager.DocumentSelector);

        if(!viewer)return;

        for(let i=0;i<viewer.scrollHeight;i+=frameSpeed){
            viewer.scroll(0, i);
            await new Promise(resolve=>{setTimeout(resolve, waitTime_ms)});
        }
        viewer.scroll(0, viewer.scrollHeight);
    }

    public static getIsViewerOpened(): boolean{
        return Boolean(document.querySelector(PdfViewerManager.DocumentSelector));
    }

    public static getPageBlobUrls(): string[]{
        let urls: string[]=new Array();
        document.querySelectorAll(PdfViewerManager.ImageSelector).forEach((e: HTMLImageElement)=>{
            urls.push(e.src);
        });
        return urls;
    }
}

console.log("[GdUE] 拡張機能は有効です");

// setInterval(()=>{
//     console.log(PdfViewerManager.getFileName())
// }, 1000);