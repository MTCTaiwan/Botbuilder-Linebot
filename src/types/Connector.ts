import fetch from "isomorphic-fetch";
import * as botbuilder from "botbuilder";
import * as crypto from "crypto";
import * as bodyParser from "body-parser";
import * as ExpressCore from "express-serve-static-core";

import * as LineMessage from "./Message";

import LineAPI from "./API";
import VARIABLES from "./Variables";
import { LOADIPHLPAPI } from "dns";

enum EMessageEventSource {
    USER,
    GROUP,
    ROOM
}

interface IConnectorOptions {
    channelId: string;
    channelSecret: string;
    channelAccessToken: string;
    verify: boolean;
    hasPushApi: boolean;
    autoGetUserProfile: boolean;
}

interface IErrorResponses {
    message: string;
    details: Array<{
        message: string,
        property: string
    }>;
}

export class Connector implements botbuilder.IConnector {

    // Const Variables
    private botId: string;
    private pushMessage: boolean = false;
    private autoGetUserProfile: boolean = false;
    private api: LineAPI;

    // Dispatch Events
    private _replyToken: string = VARIABLES.TOKEN.INVALID;
    private _replyTokenTimestamp: number;
    get replyToken(): string {
        return this._replyToken;
    }
    set replyToken(replyToken: string) {
        this._replyToken = replyToken;
        if (replyToken !== VARIABLES.TOKEN.INVALID) {
            this._replyTokenTimestamp = Date.now();
        }
    }

    private options: IConnectorOptions;
    private conversationId: string;
    private conversationType: string;
    private replyQueue: Array<any>;

    // Bot Service Event
    private handler: (events: botbuilder.IEvent[], callback?: (err: Error) => void) => void;
    private timer: number;

    constructor(options: IConnectorOptions) {
        this.options = options;
        this.options.channelId = options.channelId || "";
        this.options.channelSecret = options.channelSecret || "";
        this.options.channelAccessToken = options.channelAccessToken || "";
        if (this.options.verify === undefined) {
            this.options.verify = true;
        }
        if (this.options.hasPushApi !== undefined) {
            this.pushMessage = this.options.hasPushApi;
        }
        if (this.autoGetUserProfile !== undefined) {
            this.autoGetUserProfile = this.options.autoGetUserProfile;
        }
        this.api = new LineAPI(this.options.channelAccessToken);

        this.botId = options.channelId;
        this.replyQueue = [];
    }

    private verify(rawBody: string| Buffer, signature: string) {
        const hash = crypto.createHmac("sha256", this.options.channelSecret)
            .update(rawBody, "utf8")
            .digest("base64");
        console.log("[INFO] hash === signature", hash === signature, hash, signature);
        return hash === signature;
    }

    listen() {
        console.log("listen");
        const parser = bodyParser.json({
            verify: function (req: any, res, buf, encoding) {
                req.rawBody = buf.toString(encoding);
            }
        });
        return (req: any, res: ExpressCore.Response) => {
            parser(req, res, () => {
                if (this.options.verify && !this.verify(req.rawBody, req.get("X-Line-Signature"))) {
                    return res.sendStatus(400);
                }
                return res.json(this.dispatch(req.body));
            });
        };
    }

    // private verify(buf: string | Buffer, signature: string): boolean {

    //     const rawBody = Buffer.isBuffer(buf) ? buf.toString() : buf;
    //     console.log("String", rawBody, typeof rawBody);
    //     const hash = crypto.createHmac("sha256", this.options.channelSecret)
    //         .update(rawBody)
    //         .digest("base64");
    //     console.log("[INFO] hash === signature", hash, signature, rawBody);
    //     return hash === signature;
    //     // console.log("[INFO] hash === signature", hash, this.s2b(signature, "base64"), rawBody);
    //     // return hash === this.s2b(signature, "base64");
    // }
    // public listen() {
    //     console.log("listen");
    //     // const parser: ExpressCore.RequestHandler = bodyParser.json({
    //     //     verify: function (req: any, res, buf, encoding) {
    //     //         const strBody = Buffer.isBuffer(buf) ? buf.toString() : buf;
    //     //         req.body = "Apple"; //JSON.stringify(strBody);
    //     //     }
    //     // });
    //     return (req: ExpressCore.Request, res: ExpressCore.Response) => {
    //         // parser(req, res, () => {
    //         const signature = req.headers["x-line-signature"] as string;
    //         if (!signature) {
    //             throw new Error("no signature");
    //         }
    //         // console.log(req.body, validateSignature(req.body, this.options.channelSecret, signature));
    //         if (this.options.verify && !this.verify(req.body, signature)) {
    //             return res.sendStatus(400);
    //         }
    //         this.dispatch(req.body);
    //         return res.json({});
    //         // });
    //     };
    // }

    // @DEPRECATED
    // async serverlessWebhock(event) {
    //     this.dispatch(JSON.parse(event.body), undefined);
    // }


    private async dispatch(body: { events: Array<LineMessage.ILINEEvent> }) {
        console.log("dispatch");
        const _this = this;
        if (!body || !body.events) {
            console.log("dispatch return");
            return;
        }
        body.events.forEach(async event => {
            console.log("event", event);
            _this.resetReplyToken(event.replyToken);
            const m: any = await LineMessage.handleMessage(event);

            // switch (event.type) {
            //     case "message":
            //         m.id = event.message.id;

            //         m.type = "message";

            //         const message = event.message;

            //         switch (message.type) {
            //             case "text":
            //                 m.text = event.message.text;
            //                 break;
            //             case "image":
            //                 m.attachments = [{
            //                     contentType: "image", contentUrl: "", name: ""
            //                 }];
            //                 break;
            //             case "video":
            //                 m.attachments = [{
            //                     contentType: "video", contentUrl: "", name: ""
            //                 }];
            //                 break;
            //             case "audio":
            //                 m.attachments = [{
            //                     contentType: "audio", contentUrl: "", name: ""
            //                 }];
            //                 break;
            //             case "location":
            //                 m.attachments = [{
            //                     "type": "location",
            //                     "id": event.message.id,
            //                     "latitude": event.message.latitude,
            //                     "longitude": event.message.longitude
            //                 }];

            //                 break;
            //             case "sticker":
            //                 m.attachments = [{
            //                     contentType: "sticker", contentUrl: "", name: ""
            //                 }];

            //                 break;
            //             default:
            //                 throw new Error(`Unknown message: ${JSON.stringify(message)}`);
            //         }

            //         break;
            //     case "follow":
            //         m.id = event.source.userId;

            //         m.type = "conversationUpdate";
            //         m.text = "follow";
            //         break;

            //     case "unfollow":

            //         m.id = event.source.userId;
            //         m.type = "conversationUpdate";
            //         m.text = "unfollow";
            //         break;

            //     case "join":
            //         m.membersAdded = [{}];
            //         m.type = "conversationUpdate";
            //         m.text = "join";
            //         break;

            //     case "leave":
            //         m.membersRemoved = true;
            //         m.type = "conversationUpdate";
            //         m.text = "leave";
            //         break;
            //     case "postback":

            //         m.type = "message";
            //         let data = event.postback.data;
            //         if (data === "DATE" || data === "TIME" || data === "DATETIME") {
            //             data += `(${JSON.stringify(event.postback.params)})`;
            //         }
            //         m.text = data;
            //         break;
            //     case "beacon":
            //         break;

            //     default:
            //         throw new Error(`Unknown event: ${JSON.stringify(event)}`);
            // }
            console.log("m", m);
            _this.handler([m]);

        });
    }

    onEvent(handler: any) {
        this.handler = handler;
    }

    private async reply(replyToken: string, message: any) {
        console.log("REPLY", message);
        const payload = LineMessage.createMessages(message);
        if (Array.isArray(message) && message.length > 0) {
            this.api.reply(replyToken, payload);
        } else {
            console.warn("\x1b[33m[WARN] Reply a empty message\x1b[0m");
        }
    }

    async leave() {
        // if (this.conversationType === undefined) {
        //     throw new Error("not room or group");
        // }
        // const url = `/${this.conversationType === "group" ? "group" : this.conversationType === "room" ? "room" : ""}/${this.conversationId}/leave`;

        // const body = {
        //     replyToken: this.replyToken,
        // };

        // const res = await this.post(url, body).then<any>();
        // const r: IErrorResponses = res.json().then();
        // if (r.message) {
        //     throw new Error(r.message);
        // }
        // return r;
    }


    private getRenderTemplate(event: any): any {
        const _this = this;

        switch (event.type) {
            case "message":
                if (event.text) {
                    if (event.suggestedActions && event.suggestedActions.actions && event.suggestedActions.actions.length > 0) {
                        const l = event.suggestedActions.actions.length;
                        switch (l) {
                            // case 2:
                            //     //confirm

                            //     return {
                            //         type: "template",
                            //         altText: getAltText(event.text),
                            //         template: {
                            //             type: "confirm",
                            //             // title: event.text || "",
                            //             text: `${event.text || ""}`,
                            //             actions: event.suggestedActions.actions.map(b =>
                            //                 getButtonTemp(b)
                            //             )
                            //         }
                            //     }

                            default:
                                return {
                                    type: "template",
                                    altText: LineMessage.getTrunctText(event.text),
                                    template: {
                                        type: "buttons",
                                        // title: event.text || "",
                                        text: `${event.text || ""}`,
                                        actions: event.suggestedActions.actions.map((b: any) =>
                                            LineMessage.getButtonTemp(b)
                                        )
                                    }
                                };


                        }
                    }

                    return {
                        type: "text",
                        text: event.text
                    };
                } else if (event.attachments) {

                    if (event.attachmentLayout === "carousel") {
                        // for carousel
                        // for image carousel
                        const be_same = event.attachments.reduce((c: any, n: any) => {
                            return c.contentType === n.contentType;
                        });
                        if (!be_same) {
                            throw new Error("must be same attachment");
                        }
                        if (event.attachments[0].contentType === "application/vnd.microsoft.card.hero") {
                            const be_image_carousel = event.attachments.reduce((c: any, n: any) => {
                                return c.content.images.length === 1 && n.content.images.length === 1 && c.content.buttons.length === 1 && n.content.buttons.length === 1;
                            });

                            if (be_image_carousel) {
                                return {
                                    "type": "template",
                                    "altText": LineMessage.getTrunctText(event.attachments[0].content.text),
                                    "template": {
                                        "type": "image_carousel",
                                        "columns": event.attachments.map((a: any) => {
                                            return {
                                                imageUrl: a.content.images[0].url,
                                                action: LineMessage.getButtonTemp(a.content.buttons[0])
                                            };
                                        })
                                    }
                                };
                            } else {
                                const t: any = {
                                    type: "template",
                                    altText: LineMessage.getButtonTemp(event.attachments[0].content.text),
                                    template: {
                                        type: "carousel",
                                        imageAspectRatio: "rectangle",
                                        imageSize: "cover",

                                        columns: event.attachments.map((a: any) => {
                                            const c: any = {
                                                title: a.content.title || "",
                                                text: `${a.content.title || ""}${a.content.subtitle || ""}`,
                                                actions: a.content.buttons.map((b: any) =>
                                                    LineMessage.getButtonTemp(b)
                                                )
                                            };
                                            if (a.content.images) {
                                                c.thumbnailImageUrl = a.content.images[0].url;
                                                c.imageBackgroundColor = "#FFFFFF";
                                            }
                                            return c;
                                        })

                                    }
                                };
                                return t;

                            }



                        } else {

                            throw new Error("do not suppoert this card,only support HeroCard ");
                        }





                    }

                    return event.attachments.map((a: any) => {
                        // console.log("a", a)
                        switch (a.contentType) {
                            case "sticker":
                                return { type: "sticker", packageId: a.content.packageId, stickerId: a.content.stickerId };

                            case "location":
                                return {
                                    type: "location",
                                    title: a.content.title,
                                    address: a.content.address,

                                    latitude: a.content.latitude,
                                    longitude: a.content.longitude

                                };


                            case "application/vnd.microsoft.card.video":
                                if (a.content.image && a.content.media && a.content.media[0].url.indexOf("https") > -1 && a.content.image.url.indexOf("https") > -1) {
                                    return {
                                        "type": "video",
                                        "originalContentUrl": a.content.media[0].url,
                                        "previewImageUrl": a.content.image.url
                                    };
                                } else {
                                    return new Error("need image and media");
                                }
                            case "application/vnd.microsoft.card.audio":
                                if (a.content.media && a.content.media[0].url.indexOf("https") > -1) {
                                    return {
                                        "type": "audio",
                                        "originalContentUrl": a.content.media[0].url,
                                        "duration": 240000
                                    };
                                } else {
                                    return new Error("need image and media");
                                }
                            case "application/vnd.microsoft.keyboard":
                                if (a.content.image && a.content.image.url.indexOf("https") > -1) {
                                    return {
                                        "type": "image",
                                        "originalContentUrl": a.content.image.url,
                                        "previewImageUrl": a.content.image.url
                                    };
                                }
                            case "application/vnd.microsoft.card.hero":

                                if (!a.content.buttons) {
                                    return new Error("need buttons data");
                                }

                                if (a.content.images === undefined && a.content.buttons.length === 2) {
                                    // confirm

                                    return {
                                        type: "template",
                                        altText: LineMessage.getTrunctText(a.content.text),
                                        template: {
                                            type: "confirm",
                                            title: a.content.title || "",
                                            text: `${a.content.title || ""}${a.content.subtitle || ""}`,
                                            actions: a.content.buttons.map((b: any) =>
                                                LineMessage.getButtonTemp(b)
                                            )
                                        }
                                    };
                                } else {

                                    const t: any = {
                                        type: "template",
                                        altText: a.content.text,
                                        template: {
                                            type: "buttons",
                                            title: a.content.title || "",
                                            text: `${a.content.title || ""}${a.content.subtitle || ""}`,
                                            actions: a.content.buttons.map((b: any) =>
                                                LineMessage.getButtonTemp(b)
                                            )
                                        }
                                    };
                                    if (a.content.images) {
                                        t.template.thumbnailImageUrl = a.content.images[0].url;
                                        t.template.imageAspectRatio = "rectangle";
                                        t.template.imageSize = "cover";
                                        t.template.imageBackgroundColor = "#FFFFFF";
                                    }
                                    return t;

                                }

                        }
                    });


                }
        }
    }
    send(messages: Array<any>, done: any) {
        if (messages.length > VARIABLES.LIMIT.MESSAGE_PER_REPLY) {
            console.warn("\x1b[33m[WARN] Maximum limit of 5 per reply\x1b[0m");
        }
        const encounter = this._replyTokenTimestamp;
        messages.map((e, i) => {
            if (this.pushMessage) {
                this.conversationId = e.address.channel.id;
                // this.push(this.conversationId, this.getRenderTemplate(e));
            } else if (this.replyToken) {
                // console.log(e);
                const t = this.getRenderTemplate(e);
                if (Array.isArray(t)) {
                    this.replyQueue = this.replyQueue.concat(t);
                } else {
                    this.replyQueue.push(t);
                }
                if ((this.replyQueue.length === messages.length) || this.replyQueue.length === VARIABLES.LIMIT.MESSAGE_PER_REPLY) {
                    this.flushReply(encounter);
                }
            } else {
                throw new Error(`[ERROR] Ether pushMessage or reply token is unusable`);
            }
        });
    }


    private resetReplyToken(replyToken: string) {

        const encounter = this._replyTokenTimestamp;
        console.log("addReplyToken1", this.replyToken, this.replyQueue);
        this.replyToken = replyToken;

        this.timer = <any>setTimeout(() => {

            if (this.replyToken !== VARIABLES.TOKEN.INVALID) {
                if (this.replyQueue.length == 0) {
                    console.warn("[WARN] No reply message in queue, token will be expired");
                }
                this.flushReply(encounter);
            }

        }, VARIABLES.TOKEN.EXPIRE);
    }

    private flushReply(encounter?: number): void {
        const token = this.replyToken || VARIABLES.TOKEN.INVALID;
        console.log("encounter === this._replyTokenTimestamp", encounter === this._replyTokenTimestamp);
        this.reply(token, this.replyQueue);
        if (encounter && encounter === this._replyTokenTimestamp) {
            // this.replyToken = VARIABLES.TOKEN.INVALID;
            this.replyQueue = [];
        }
    }

    startConversation(address: botbuilder.IAddress, callback: (err: Error, address?: botbuilder.IAddress) => void): void {
        console.log(address);
        console.log(callback);
    }

}
