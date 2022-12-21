import { ChatGPTAPI, ChatGPTAPIBrowser } from "chatgpt";

import { config } from "./config.js";
<<<<<<< HEAD
import { execa } from "execa";
import { delay } from "delay";
import { Cache } from "./cache.js";
import { ContactInterface, RoomInterface } from "wechaty/impls";
=======

>>>>>>> 69f7367df075f82e566b83fee00a6954a7366102
import {
  IChatGPTItem,
  IConversationItem,
  AccountWithUserInfo,
  IAccount,
} from "./interface.js";

const ErrorCode2Message: Record<string, string> = {
  "503":
    "OpenAI 服务器繁忙，请稍后再试| The OpenAI server is busy, please try again later. 为避免访问频繁限流，请尽量在一条信息中包含更多信息；注意不要讨论敏感话题~（如遇访问限流请在下一个整点回来尝试~i）; 本bot为同学自发建立，初衷是希望更多人能够对于前沿的研究进展有一个感受，有能力的用户欢迎访问 https://chat.openai.com/chat 自行体验~！",
  "429":
    "OpenAI 服务器限流，请稍后再试| The OpenAI server was limited, please try again later. 为避免访问频繁限流，请尽量在一条信息中包含更多信息；注意不要讨论敏感话题~（如遇访问限流请在下一个整点回来尝试~i）; 本bot为同学自发建立，初衷是希望更多人能够对于前沿的研究进展有一个感受，有能力的用户欢迎访问 https://chat.openai.com/chat 自行体验~！",
  "500":
<<<<<<< HEAD
    "OpenAI 服务器繁忙，请稍后再试| The OpenAI server is busy, please try again later. 为避免访问频繁限流，请尽量在一条信息中包含更多信息；注意不要讨论敏感话题~（如遇访问限流请在下一个整点回来尝试~i）; 本bot为同学自发建立，初衷是希望更多人能够对于前沿的研究进展有一个感受，有能力的用户欢迎访问 https://chat.openai.com/chat 自行体验~！",
=======
    "OpenAI 服务器繁忙，请稍后再试| The OpenAI server is busy, please try again later",
  "403":
    "OpenAI 服务器拒绝访问，请稍后再试| The OpenAI server refused to access, please try again later",
>>>>>>> 69f7367df075f82e566b83fee00a6954a7366102
  unknown: "未知错误，请看日志 | Error unknown, please see the log",
};
const Commands = ["/reset", "/help"] as const;
export class ChatGPTPool {
  chatGPTPools: Array<IChatGPTItem> | [] = [];
  conversationsPool: Map<string, IConversationItem> = new Map();
  async resetAccount(account: IAccount) {
    // Remove all conversation information
    this.conversationsPool.forEach((item, key) => {
      if ((item.account as AccountWithUserInfo)?.email === account.email) {
        this.conversationsPool.delete(key);
      }
    });
    // Relogin and generate a new session token
    const chatGPTItem = this.chatGPTPools.find(
      (
        item: any
      ): item is IChatGPTItem & {
        account: AccountWithUserInfo;
        chatGpt: ChatGPTAPI;
      } => item.account.email === account.email
    );
    if (chatGPTItem) {
      const account = chatGPTItem.account;
      try {
        chatGPTItem.chatGpt = new ChatGPTAPIBrowser({
          ...account,
          proxyServer: config.openAIProxy,
        });
      } catch (err) {
        //remove this object
        this.chatGPTPools = this.chatGPTPools.filter(
          (item) =>
            (item.account as AccountWithUserInfo)?.email !== account.email
        );
        console.error(
          `Try reset account: ${account.email} failed: ${err}, remove it from pool`
        );
      }
    }
  }
  resetConversation(talkid: string) {
    this.conversationsPool.delete(talkid);
  }
  async startPools() {
    this.chatGPTPools = await Promise.all(
        config.chatGPTAccountPool.map(async (account) => {
          const chatGpt = new ChatGPTAPIBrowser({
            ...account,
            proxyServer: config.openAIProxy,
          });
          await chatGpt.initSession();
          return {
            chatGpt: chatGpt,
            account: account,
          };
        })
    );
    if (this.chatGPTPools.length === 0) {
      throw new Error("⚠️ No chatgpt account in pool");
    }
    console.log(`ChatGPTPools: ${this.chatGPTPools.length}`);
  }
  async command(cmd: typeof Commands[number], talkid: string): Promise<string> {
    console.log(`command: ${cmd} talkid: ${talkid}`);
    if (cmd == "/reset") {
      this.resetConversation(talkid);
      return "♻️ 已重置对话 ｜ Conversation reset";
    }
    if (cmd == "/help") {
      return `🧾 支持的命令｜Support command：${Commands.join("，")}`;
    }
    return "❓ 未知命令｜Unknow Command";
  }
  // Randome get chatgpt item form pool
  get chatGPTAPI(): IChatGPTItem {
    return this.chatGPTPools[
      Math.floor(Math.random() * this.chatGPTPools.length)
    ];
  }
  // Randome get conversation item form pool
  getConversation(talkid: string): IConversationItem {
    if (this.conversationsPool.has(talkid)) {
      return this.conversationsPool.get(talkid) as IConversationItem;
    }
    const chatGPT = this.chatGPTAPI;
    if (!chatGPT) {
      throw new Error("⚠️ No chatgpt item in pool");
    }
    //TODO: Add conversation implementation
    const conversation = chatGPT.chatGpt;
    const conversationItem = {
      conversation,
      account: chatGPT.account,
    };
    this.conversationsPool.set(talkid, conversationItem);
    return conversationItem;
  }
  setConversation(talkid: string, conversationId: string, messageId: string) {
    const conversationItem = this.getConversation(talkid);
    this.conversationsPool.set(talkid, {
      ...conversationItem,
      conversationId,
      messageId,
    });
  }
  // send message with talkid
  async sendMessage(message: string, talkid: string): Promise<string> {
    if (
      Commands.some((cmd) => {
        return message.startsWith(cmd);
      })
    ) {
      return this.command(message as typeof Commands[number], talkid);
    }
    const conversationItem = this.getConversation(talkid);
    const { conversation, account, conversationId, messageId } =
      conversationItem;
    try {
      // TODO: Add Retry logic
      const {
        response,
        conversationId: newConversationId,
        messageId: newMessageId,
      } = await conversation.sendMessage(message, {
        conversationId,
        parentMessageId: messageId,
      });
      // Update conversation information
      this.setConversation(talkid, newConversationId, newMessageId);
      return response;
    } catch (err: any) {
      if (err.message.includes("ChatGPT failed to refresh auth token")) {
        // If refresh token failed, we will remove the conversation from pool
        await this.resetAccount(account);
        console.log(`Refresh token failed, account ${JSON.stringify(account)}`);
        return this.sendMessage(message, talkid);
      }
      console.error(
        `err is ${err.message}, account ${JSON.stringify(account)}`
      );
      // If send message failed, we will remove the conversation from pool
      this.conversationsPool.delete(talkid);
      // Retry
      return this.error2msg(err);
    }
  }
  // Make error code to more human readable message.
  error2msg(err: Error): string {
    for (const code in ErrorCode2Message) {
      if (err.message.includes(code)) {
        return ErrorCode2Message[code];
      }
    }
    return ErrorCode2Message.unknown;
  }
}
<<<<<<< HEAD
export class ChatGPTBot {
  // Record talkid with conversation id
  conversations = new Map<string, ChatGPTConversation>();
  chatGPTPool = new ChatGPTPoole();
  cache = new Cache("cache.json");
  chatPrivateTiggerKeyword = config.chatPrivateTiggerKeyword;
  botName: string = "";
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
      messageType > MessageType.GroupNote ||
      talker.name() == "微信团队" ||
      // 语音(视频)消息
      text.includes("收到一条视频/语音聊天消息，请在手机上查看") ||
      // 红包消息
      text.includes("收到红包，请在手机上查看") ||
      // 位置消息
      text.includes("/cgi-bin/mmwebwx-bin/webwxgetpubliclinkimg")
      // initial greetings
      text.startsWith("我是") ||
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
    const maintain = true;
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
               return await this.trySay(talker,"Hi, it's nice to meet you. I'm Assistant, a large language model trained by OpenAI. I'm here to help answer any questions you may have. Is there anything you'd like to chat about?  为避免访问频繁限流，请尽量在一条信息中包含更多信息；注意不要讨论敏感话题~（如遇访问限流请在下一个整点回来尝试~i）; 本bot为同学自发建立，初衷是希望更多人能够对于前沿的研究进展有一个感受，有能力的用户欢迎访问 https://chat.openai.com/chat 自行体验~！");
          }
          else  {
              if(maintain){
	                return await this.trySay(talker,"抱歉bot维护中，请稍后尝试; 本bot为同学自发建立，初衷是希望更多人能够对于前沿的研究进展有一个感受，有能力的用户欢迎访问https://chat.openai.com/chat 自行体验~！ ");
	             }
              return await this.onPrivateMessage(talker, text);
          }
      } else {
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
=======
>>>>>>> 69f7367df075f82e566b83fee00a6954a7366102
