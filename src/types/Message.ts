import VARIABLES from "./Variables";

export declare interface ILINEEventPostback extends ILINEEvent {
    data: string;
    params: { date?: string, time?: string, datetime?: string };
}

export declare interface ILINEEventBeacon extends ILINEEvent {
    hwid: string;
    type: string;
    dm: string;
}


export declare interface ILINEEventAccountLink extends ILINEEvent {
    result: string;
    nonce: string;
}

export declare interface ILINEEventMessage {
    id: string;
    type: string;
    text?: string;
    fileName?: string;
    fileSize?: string;
    title?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    packageId?: string;
    stickerId?: string;

}

export declare interface ILINEEventSource {
    type: string; // = "user" | "group" | "room"
    userId: string;
    groupId?: string;
    roomId?: string;
}

export declare interface ILINEEvent {
    type: string; // = "message" | "follow" | "unfollow" | "join" | "leave" | "postback" | "beacon" | "accountLink"
    replyToken?: string;
    timestamp: string;
    source: ILINEEventSource;
    message?: ILINEEventMessage;
    postback?: ILINEEventPostback;
    beacon?: ILINEEventBeacon;
    link: ILINEEventAccountLink;
}

export declare interface ILINEReplyBase {
    type: string;
    title: string;
    value: string;
}

export declare interface ILINEReply {
    type: string; // "postback" | "uri" | "datetimepicker" | "message"
    label: string;
    data?: string;
    uri?: string;
    date?: string;
    mode?: string;
    initial?: string;
    max?: string;
    min?: string;
    text?: string;
}

export function getButtonTemp(b: ILINEReplyBase): ILINEReply {
    if (b.type === "postBack") {
        return {
            type: "postback",
            label: b.title,
            data: b.value,
        };
    }
    else if (b.type === "openUrl") {
        return {
            type: "uri",
            label: b.title ? b.title : "open url",
            uri: b.value
        };
    } else if (b.type === "datatimepicker") {
        return {
            type: "datetimepicker",
            label: b.title,
            data: "data=datatimepicker",
            mode: "datetime",
            initial: new Date(new Date().getTime() - (1000 * 60 * new Date().getTimezoneOffset())).toISOString().substring(0, new Date().toISOString().length - 8),
            max: new Date(new Date().getTime() + (1000 * 60 * 60 * 24 * 30 * 12)).toISOString().substring(0, new Date().toISOString().length - 8),
            min: new Date(new Date().getTime() - (1000 * 60 * 60 * 24 * 30 * 12)).toISOString().substring(0, new Date().toISOString().length - 8),
        };
    } else {
        return {
            type: "message",
            label: b.title,
            text: b.value
        };
    }
}

export function getTrunctText(str: string): string {
    if (str.length > VARIABLES.LIMIT.TEXT_MESSAGE_LENGTH) {
        console.warn("\x1b[33m[WARN] Maximum limit of 2000 per message\x1b[0m");
    }
    return str.substring(0, VARIABLES.LIMIT.TEXT_MESSAGE_LENGTH);
}


// simple reply function
export function replyText (client: any, token: any, texts: any) {
    texts = Array.isArray(texts) ? texts : [texts];
    return client.replyMessage(
        token,
        texts.map((text: string) => ({ type: "text", text }))
    );
}

function toISOTimestamp(timestamp: string): string {
    return new Date(parseInt(timestamp)).toISOString();
}

function handleAddress(source: any): any {
    const id = source[`${source.type}Id`];
    const isGroup = (source.type === "user") ? false : true;
    const name = source.type;
    return {
        conversation: { name, id, isGroup },
        channel: { id },
        user: { name, id }
    };
}

function handleConversation(address: any): any {
    return {
        id: address.channel.id,
        type: address.conversation.name
    };
}


function handleMessageEvent (event: any) {

    const addAttachment = (type: string, url?: string, name?: string) => {
        return {
            contentType: type,
            contentUrl: url || "",
            name: name || ""
        };
    };

    const message: any = ((emsg: any) => {
        console.log("Message Type:", emsg.type);
        switch (emsg.type) {
            case "image":
            case "video":
            case "audio":
            case "sticker":
                return {
                    attachments: [
                        addAttachment(emsg.type)
                    ]
                };
            case "location":
                return {
                    attachments: [{
                        "type": "location",
                        "id": emsg.id,
                        "latitude": emsg.latitude,
                        "longitude": emsg.longitude
                    }]
                };
            case "text":
                return {
                    text: emsg.text
                };
            default:
                throw new Error(`Unknown message: ${JSON.stringify(emsg)}`);
            }
        })(event.message);

    return {
        ...message,
        id:  event.message.id,
        type: "message"
    };
}

function handleFollowEvent (event: any) {
    return {
        id: event.source.userId,
        type: `event:${event.type}`,
        text: event.type
    };
}

function handleJoinEvent (event: any) {
    console.log(event);
    return {
        // TODO: get member info
        membersAdded: (event.type === "join") ? [{}] : undefined,
        membersRemoved: (event.type === "leave") ? true : undefined,
        type: `event:${event.type}`,
        text: event.type
    };
}

function handlePostBackEvent (event: any) {
    let data = event.postback.data;
    if (data === "DATE" || data === "TIME" || data === "DATETIME") {
        data += `(${JSON.stringify(event.postback.params)})`;
    }
    console.log("POSTBACK", event.postback);
    return {
        type: "messsge",
        text: data
    };
}

function handleBeaconEvent (event: any) {

}

function handleEventType (event: any) {
    switch (event.type) {
        case "message":
            return handleMessageEvent(event);
        case "follow":
        case "unfollow":
            return handleFollowEvent(event);
        case "join":
        case "leave":
            return handleJoinEvent(event);
        case "postback":
            return handlePostBackEvent(event);
        case "beacon":
            return handleBeaconEvent(event);
        default:
            throw new Error(`Unknown event: ${JSON.stringify(event)}`);
    }
}

export async function handleMessage (event: any) {
    // let message: any = ;
    const address: any = handleAddress(event.source);
    const conversation: any = handleConversation(address);
    const message = handleEventType(event);

    if (event.source.type == "user" && event.source.userId) {

        try {
            console.log("====== IS USER =======");
            // const r = await this.api.getUserProfile(event.source.userId);
            // message.from = {
            //     id: event.source.userId,
            //     name: r.displayName,
            //     pictureUrl: r.pictureUrl,
            //     statusMessage: r.statusMessage
            // };
        } catch (e) {
            console.log(e);

        }
    }

    return {
        ...message,
        from: {
            id: event.source.userId
        },
        timestamp: toISOTimestamp(event.timestamp),
        source: "line",
        address,
        // TODO: Removing conversationId
        // conversationId: conversation.id,
        // conversationType: conversation.type
        // conversation
    };
}



export function createMessages(message: string|Array<any>) {

    console.log("Create Message", message);

    // TODO : JSON.Stringify
    if (typeof message === "string") {
        return [{ type: "text", text: message }];
    }

    if (Array.isArray(message)) {
        return message.map(function (m) {
            if (typeof m === "string") {
                return { type: "text", text: m };
            }
            return m;
        });
    }
    return [message];

    // TODO CleanUp
    // return [{ type: "text", text: JSON.stringify(message)} ];
}
