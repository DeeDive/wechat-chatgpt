import { ChatGPTPool } from "./chatgpt.js";
import { config } from "./config.js";
import { ContactInterface, RoomInterface } from "wechaty/impls";
import { Message } from "wechaty";
import delay from "delay";
enum MessageType {
  Unknown = 0,

  Attachment = 1, // Attach(6),
  Audio = 2, // Audio(1), Voice(34)
  Contact = 3, // ShareCard(42)
  ChatHistory = 4, // ChatHistory(19)
  Emoticon = 5, // Sticker: Emoticon(15), Emoticon(47)
  Image = 6, // Img(2), Image(3)
  Text = 7, // Text(1)
  Location = 8, // Location(48)
  MiniProgram = 9, // MiniProgram(33)
  GroupNote = 10, // GroupNote(53)
  Transfer = 11, // Transfers(2000)
  RedEnvelope = 12, // RedEnvelopes(2001)
  Recalled = 13, // Recalled(10002)
  Url = 14, // Url(5)
  Video = 15, // Video(4), Video(43)
  Post = 16, // Moment, Channel, Tweet, etc
}

const SINGLE_MESSAGE_MAX_SIZE = 500;
export class ChatGPTBot {
  // Record talkid with conversation id
  chatGPTPool = new ChatGPTPool();
  chatPrivateTiggerKeyword = config.chatPrivateTiggerKeyword;
  botName: string = "";
  ready = false;
  setBotName(botName: string) {
    this.botName = botName;
  }
  get chatGroupTiggerKeyword(): string {
    return `@${this.botName}`;
  }
  async startGPTBot() {
    console.debug(`Start GPT Bot Config is:${JSON.stringify(config)}`);
    await this.chatGPTPool.startPools();
    console.debug(`🤖️ Start GPT Bot Success, ready to handle message!`);
    this.ready = true;
  }
  // TODO: Add reset conversation id and ping pong
  async command(): Promise<void> {}
  // remove more times conversation and mention
  cleanMessage(rawText: string, privateChat: boolean = false): string {
    let text = rawText;
    const item = rawText.split("- - - - - - - - - - - - - - -");
    if (item.length > 1) {
      text = item[item.length - 1];
    }
    text = text.replace(
      privateChat ? this.chatPrivateTiggerKeyword : this.chatGroupTiggerKeyword,
      ""
    );
    // remove more text via - - - - - - - - - - - - - - -
    return text;
  }
  async getGPTMessage(text: string, talkerId: string): Promise<string> {
    return await this.chatGPTPool.sendMessage(text, talkerId);
  }
  // The message is segmented according to its size
  async trySay(
    talker: RoomInterface | ContactInterface,
    mesasge: string
  ): Promise<void> {
    const messages: Array<string> = [];
    let message = mesasge;
    while (message.length > SINGLE_MESSAGE_MAX_SIZE) {
      messages.push(message.slice(0, SINGLE_MESSAGE_MAX_SIZE));
      message = message.slice(SINGLE_MESSAGE_MAX_SIZE);
    }
    messages.push(message);
    for (const msg of messages) {
      await talker.say(msg);
    }
  }
  // Check whether the ChatGPT processing can be triggered
  tiggerGPTMessage(text: string, privateChat: boolean = false): boolean {
    const chatPrivateTiggerKeyword = this.chatPrivateTiggerKeyword;
    let triggered = false;
    if (privateChat) {
      triggered = chatPrivateTiggerKeyword
        ? text.includes(chatPrivateTiggerKeyword)
        : true;
    } else {
      triggered = text.includes(this.chatGroupTiggerKeyword);
    }
    if (triggered) {
      console.log(`🎯 Triggered ChatGPT: ${text}`);
    }
    return triggered;
  }
  // Filter out the message that does not need to be processed
  isNonsense(
    talker: ContactInterface,
    messageType: MessageType,
    text: string
  ): boolean {
    return (
      talker.self() ||
      talker.name().includes("noreply")|| 
      talker.name() =="Carbon Monoxide Dimer CO.2" || 
      // TODO: add doc support
      messageType !== MessageType.Text ||
      talker.name() == "微信团队" ||
      // 语音(视频)消息
      text.includes("收到一条视频/语音聊天消息，请在手机上查看") ||
      // 红包消息
      text.includes("收到红包，请在手机上查看") ||
      // Transfer message
      text.includes("收到转账，请在手机上查看") ||
      // initial greetings
      text.startsWith("我是") ||
      // 位置消息
      text.includes("/cgi-bin/mmwebwx-bin/webwxgetpubliclinkimg")
    );
  }

  async onPrivateMessage(talker: ContactInterface, text: string) {
    const talkerId = talker.id;
    const gptMessage = await this.getGPTMessage(text, talkerId);
    await this.trySay(talker, gptMessage);
  }

  async onGroupMessage(
    talker: ContactInterface,
    text: string,
    room: RoomInterface
  ) {
    const talkerId = room.id + talker.id;
    const gptMessage = await this.getGPTMessage(text, talkerId);
    const result = `${text}\n ------\n ${gptMessage}`;
    console.log("###==="+result+"===###")
    await this.trySay(room, result);
  }
  async onMessage(message: Message) {
    const maintain = false;
    const talker = message.talker();
    const rawText = message.text();
    const room = message.room();
    const messageType = message.type();
    const privateChat = !room;
    if (this.isNonsense(talker, messageType, rawText)) {
      return;
    }
    if (this.tiggerGPTMessage(rawText, privateChat)) {
      //random pausing
      console.log('pausing for chatgpt for random [0,240s]...')
      let timeInMs = Math.random() * (240000);
      delay(timeInMs);
      const text = this.cleanMessage(rawText, privateChat);
      if (privateChat) {
          if (text.startsWith("You have added")) {
               return await this.trySay(talker,"Hi, it's nice to meet you. I'm Assistant, a large language model trained by OpenAI. I'm here to help answer any questions you may have. Is there anything you'd like to chat about?  为避免访问频繁限流，请尽量在一条消息中包含更多信息量；注意不要讨论敏感话题~（如遇访问限流请在下一个整点回来尝试~i）; 本bot为同学自发建立，初衷是希望更多人能够对于前沿的研究进展有一个感受，有能力的用户欢迎访问 https://chat.openai.com/chat 自行体验~！");
          }
          else  {
              if(maintain){
	                return await this.trySay(talker,"抱歉bot维护中，请稍后尝试; 本bot为同学自发建立，初衷是希望更多人能够对于前沿的研究进展有一个感受，有能力的用户欢迎访问https://chat.openai.com/chat 自行体验~！ ");
	             }
              return await this.onPrivateMessage(talker, text);
          }
      }  else {
          if(maintain){
	                return await this.trySay(talker,"抱歉bot维护中，请稍后尝试; 本bot为同学自发建立，初衷是希望更多人能够对于前沿的研究进展有一个感受，有能力的用户欢迎访问https://chat.openai.com/chat 自行体验~！ ");
	             }
          return await this.onGroupMessage(talker, text, room);
      }
      } else {
        return;
      }
  }
}
