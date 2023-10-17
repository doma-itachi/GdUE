import { useState, useLayoutEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

interface Log{
    context: string;
    status: LogStatus;
}

enum LogStatus{
    info,
    warn
}

function Header(){
    return (
        <div className="logoWrap">
            <div className="appName">GdUE</div>
            <div className="version">v1.0.0</div>
        </div>
    )
}

function Log({log}){
    const logItems=log.map((e: Log)=>{
        return(<li className={e.status?"logWarn":""}>{e.context}</li>);
    })

    let logWrapElementRef=useRef<HTMLOListElement>(null);
    useLayoutEffect(()=>{
        console.log("更新されました");
        logWrapElementRef.current.scrollTop=logWrapElementRef.current.scrollHeight;
    })

    return (
        <div className="logWrap">
            <div className="logHeader">
                <div>ログ</div>
            </div>
            <ol ref={logWrapElementRef}>
                {logItems}
            </ol>
        </div>
    )
}

function Controller({isExtract, clicked}){
    return (
        <div className="controller">
            <button className={`${isExtract?"controllerBtnStop":""} controllerBtn`} onClick={clicked}>
                {!isExtract?"Extract!":"Stop"}
            </button>
            <div className="controllerMsgWrap">
                {/* <div className="controllerMsg">
                    Extract completed!
                </div> */}
            </div>
        </div>
    )
}

let logs: Log[]=new Array();
logs.push({context: "抽出開始前に対象のドキュメントを開かないでください", status:LogStatus.warn});
let setLogs;
let setIsExtractFn;

const Panel=()=>{
    // function testClick(){
    //     // logs.push({context: "あいうえお", status: LogStatus.info});
    //     // setLogItems(logs);
    //     // console.log(logs);//これは動かない

    //     setLogItems([...logItems, {context: "あいうえお", status: LogStatus.warn}]);
    //     console.log("追加されました");
    // }
    const [logItems, setLogItems]=useState([{context: "抽出開始前に対象のドキュメントを開かないでください", status: LogStatus.warn}]);
    const [isExtract, setIsExtract]=useState(false);

    function switchExtract(){
        if(!isExtract){
            startExtract();
        }
        else{
            stopExtract();
        }
        setIsExtract(!isExtract);
    }

    setIsExtractFn=setIsExtract;
    setLogs=setLogItems;
    return(
        <div className="App">
            <Header/>
            <div className="content">
                {/* <button onClick={testClick}>{logItems[0].context}</button> */}
            </div>
            <Controller isExtract={isExtract} clicked={switchExtract}/>
            <Log log={logItems}/>
        </div>
    )
}

const root=createRoot(document.querySelector("#root"));
root.render(<Panel/>)

function pushLog(text: string, logStatus: LogStatus){
    logs.push({context: text, status: logStatus})
    setLogs([...logs])
}


class PdfViewerManager{
    //セレクタが変わる可能性あり
    //content.tsに元ソースあり
    public static getIsViewerOpened(): boolean{
        return Boolean(document.querySelector(".a-b.a-b-ja-el-db.dif24c.bvmRsc.a-b-Oe-n.a-b-L.a-b-uoC0bf.vhoiae.KkxPLb:not([aria-hidden=true])"));
    }
    public static getFileName(): string|null{
        try{
            let fileNameSelector=".a-b-K-T.a-b-cg-Zf";
            return document.querySelector(fileNameSelector).textContent;
        }
        catch{
            return null;
        }
    }
    public static getTotalPage(): number|null{
        try{
            return Number.parseInt(document.querySelector(".a-b-La-yc-Hh").textContent);
        }
        catch{
            return null;
        }
    }
    public static async scrollToEOF(){
        const frameSpeed=400;
        const waitTime_ms=300;
        let viewer=document.querySelector(".a-b-Xa-lc.a-b-lc:has(>[role=document] img)");

        if(!viewer)return;

        for(let i=0;i<viewer.scrollHeight;i+=frameSpeed){
            viewer.scroll(0, i);
            await new Promise(resolve=>{setTimeout(resolve, waitTime_ms)});
        }
        viewer.scroll(0, viewer.scrollHeight);
    }
    public static getPageBlobUrls(): string[]{
        let urls: string[]=new Array();
        document.querySelectorAll("[role=document] img").forEach((e: HTMLImageElement)=>{
            urls.push(e.src);
        });
        return urls;
    }
}

let documentScanTimer;
interface Document{
    fileName: string,
    pageCount: number
}
let documentData: Document;

interface RequestRes{
    url: string;
    content: string;
}
let RequestReses: RequestRes[]=new Array();

async function getDocumentData(): Promise<Document>{
    let filename: string;
    let pagecount: number=null;

    filename=await new Promise((resolve)=>{
        chrome.devtools.inspectedWindow.eval(
            `(function ${PdfViewerManager.getFileName.toString()})();`,
            (result, isException)=>{
                if(isException){
                    pushLog(`空間との通信に失敗しました`, LogStatus.warn);
                }
                else{
                    if(result){
                        resolve(String(result));
                    }
                }
            }
        )
    })
    console.log(filename);
    while(pagecount==null){
        pagecount=await new Promise((resolve: any)=>{
            chrome.devtools.inspectedWindow.eval(
                `(function ${PdfViewerManager.getTotalPage.toString()})();`,
                (result, isException)=>{
                    console.log("pageCOuntが帰ってきました")
                    if(isException){
                        pushLog(`空間との通信に失敗しました`, LogStatus.warn);
                    }
                    else{
                        console.log(result);
                        if(result){
                            resolve(Number.parseInt(String(result)));
                        }
                        else{
                            setTimeout(resolve(null), 100);
                        }
                    }
                }
            )
        });

    }
    return {fileName: filename, pageCount: pagecount};
}

let isDocumentScanning=false;
function startExtract(){
    isDocumentScanning=true;
    documentScanTimer=setInterval(e=>{
        // chrome.devtools.inspectedWindow.eval(
        //     `console.log("あいうえお")`,
        //     {useContentScriptContext: true},
        //     (result, isException)=>{
        //         if(isException){
        //             pushLog(`エラー:コンテンツスクリプト空間との通信に失敗しました : ${isException.description}`, LogStatus.warn);
        //         }
        //         else{
        //             pushLog(String(result), LogStatus.info);
        //         }
        //     }
        // )

        // pushLog(`(${PdfViewerManager.getIsViewerOpened.toString()})();`, LogStatus.info);
        chrome.devtools.inspectedWindow.eval(
            `(function ${PdfViewerManager.getIsViewerOpened.toString()})();`,
            async (result, isException)=>{
                if(isException){
                    pushLog(`空間との通信に失敗しました`, LogStatus.warn);
                }
                else{
                    // pushLog(`スキャン中`, LogStatus.info);
                    
                    if(result){
                        //ドキュメントが開かれていたら
                        clearTimeout(documentScanTimer);
                        pushLog(`ドキュメントを検出しました。`, LogStatus.info);
                        //ドキュメント情報の取得
                        documentData=await getDocumentData();
                        pushLog(`抽出予定のファイル: ${documentData.fileName}, 総ページ数: ${documentData.pageCount}`, LogStatus.info);

                        //全ページをリクエストするためにスクロールする
                        pushLog("ドキュメントをクロールしています", LogStatus.info);
                        // console.log(chrome.devtools.inspectedWindow.eval(`(${PdfViewerManager.scrollToEOF.toString().replace("async", "async function")})();`));
                        await new Promise(resolve=>{
                            
                            chrome.devtools.inspectedWindow.eval(`(${PdfViewerManager.scrollToEOF.toString().replace("async", "async function")})();`,
                            (result, isException)=>{
                                if(isException){
                                    pushLog("クロールに失敗", LogStatus.warn);
                                    console.log(isException);
                                }
                                else{
                                    resolve(true);
                                }
                            })
                        });
                        while(true){
                            let prevResponseCount: number=-1;
                            prevResponseCount=await new Promise(async function(resolve){
                                console.log(`関数内: ${prevResponseCount}`);
                                if(prevResponseCount!=RequestReses.length){
                                    pushLog(`レスポンスを待機しています...${RequestReses.length}/${documentData.pageCount}`, LogStatus.info);
                                }
                                await new Promise(r=>setTimeout(r, 1000));
                                resolve(RequestReses.length);
                            });
                            console.log(`${prevResponseCount}`);
                            if(RequestReses.length>=documentData.pageCount)break;
                        }
                        // pushLog("抽出完了", LogStatus.info);

                        //URLの順番を取得
                        let pageBlobUrls: string[]=await new Promise(resolve=>{
                            chrome.devtools.inspectedWindow.eval(
                                `(function ${PdfViewerManager.getPageBlobUrls.toString()})();`,
                                (result: string[], isException)=>{
                                    if(isException){
                                        pushLog(`空間との通信に失敗しました`, LogStatus.warn);
                                    }
                                    else{
                                        resolve(result);
                                    }
                                }
                            )
                        });
                        console.log(pageBlobUrls);

                        //順番リストとレスポンスがあっているかを検証
                        pushLog("レスポンスの整合性を検証しています", LogStatus.info);
                        let isMatch=true;
                        for(let i=0;i<RequestReses.length;i++){
                            isMatch=pageBlobUrls.includes(RequestReses[i].url);
                            if(!isMatch)break;
                        }
                        if(!isMatch){
                            pushLog("整合性の検証に失敗しました。レスポンスの傍受に失敗しました", LogStatus.warn);
                            return;
                        }
                        pushLog("ダウンロードを開始", LogStatus.info);

                        //ダウンロード処理を行う
                        // let downloadFolder="GdUE_output";

                        //画像でダウンロードする
                        let downloadFolder=documentData.fileName.slice(0, documentData.fileName.lastIndexOf("."));
                        pushLog(`ダウンロード先: downloads/${downloadFolder}/`, LogStatus.info);
                        const downloadBase64=(fileName: string, base64: string)=>{
                            const bin=Uint8Array.from(atob(base64), (c: String)=>c.charCodeAt(0));
                            let blob=new Blob([bin], {type: "image/png"});
                            let objUrl=URL.createObjectURL(blob);
                            console.log(`fn: ${fileName}, objURL: ${objUrl}`);
                            chrome.downloads.download({
                                url: objUrl,
                                filename: fileName
                            });
                            URL.revokeObjectURL(objUrl);
                        }
                        for(let i=0;i<RequestReses.length;i++){
                            const page=pageBlobUrls.indexOf(RequestReses[i].url);
                            downloadBase64(`${downloadFolder}/${String(page).padStart(4, "0")}.png`, RequestReses[i].content);
                        }

                        //PDFでダウンロードする

                        //終了処理
                        pushLog("正常に終了しました", LogStatus.info);
                        isDocumentScanning=false;
                        RequestReses=new Array();
                        setIsExtractFn(false);
                    }
                }
            }
        )
        // chrome.devtools.inspectedWindow.eval(
        //     `(${PdfViewerManager.getFileName.toString()})();`,
        //     (result, exceptionInf)=>{
        //         if(exceptionInf){
        //             pushLog(`エラー:コンテンツとの通信に失敗しました : ${exceptionInf.description}`, LogStatus.warn);
        //         }
        //         else{
        //             pushLog(String(result), LogStatus.info);
        //         }
        //     }
        // )
    }, 1000)

    pushLog("抽出準備完了！対象のドキュメントを開いてください", LogStatus.info);
}
function stopExtract(){
    isDocumentScanning=false;
    clearInterval(documentScanTimer);
    pushLog("抽出を中止しました。", LogStatus.warn);
}

//ここからリクエストの抽出
chrome.devtools.network.onRequestFinished.addListener(
    async function(req){
        const imageRegex=/^image/;
        const blobRegex=/^blob:/;

        if(blobRegex.test(req.request.url) &&
            imageRegex.test(req.response.content.mimeType)){
            let url;
            let content;

            url=req.request.url;
            content=await new Promise((resolve)=>{
                req.getContent(e=>{
                    resolve(e);
                })
            })
            console.log(`${url}: ${content}`);
            RequestReses.push({url: url, content: content});
            // RequestReses.push()
        }
    }
)