const Discord = require("discord.js");
var cooldown = new Set();
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.listen(3000, () => {
  console.log("Project is ready!");
});

const { Client, Intents } = require("discord.js");
const ca = require("./config.json");
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  MessageEmbed,
} = require("discord.js");
const { MessageActionRow, MessageButton } = require("discord.js");
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_BANS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS,
    Intents.FLAGS.GUILD_INTEGRATIONS,
    Intents.FLAGS.GUILD_WEBHOOKS,
    Intents.FLAGS.GUILD_INVITES,
    Intents.FLAGS.GUILD_VOICE_STATES,
    Intents.FLAGS.GUILD_PRESENCES,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_MESSAGE_TYPING,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGE_TYPING,
  ],
});
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on("messageCreate", (message) => {
  if (message.content === "ticket") {
    const embed = new MessageEmbed()
      .setTitle("تذكرة الدعم")
      .setDescription("نقر فوق الزر أدناه لإنشاء تذكرة دعم.")
      .setColor("#00FF00");
    const button = new MessageActionRow().addComponents(
      new MessageButton()
        .setStyle("PRIMARY")
        .setLabel("إنشاء تذكرة")
        .setCustomId("create_ticket")
        .setEmoji("🎟️"),
    );
    message.channel.send({ embeds: [embed], components: [button] });
  }
  if (message.content === "stats") {
    const ticketDataS = fs.readFileSync("tickets.json", "utf-8");
    const ticketData = JSON.parse(ticketDataS);
    const totalTickets = ticketData.length;
    const openTickets = ticketData.filter((ticket) => ticket.open).length;
    const closedTickets = ticketData.filter((ticket) => !ticket.open).length;
    const statsMessage = `إجمالي التذاكر: ${totalTickets}\nالتذاكر المفتوحة: ${openTickets}\nالتذاكر المغلقة: ${closedTickets}`;
    message.channel.send({
      embeds: [
        new MessageEmbed().addFields(
          { name: "📝 إجمالي التذاكر:", value: `${totalTickets}` },
          { name: `🔓 التذاكر المفتوحة:`, value: ` ${openTickets}` },
          { name: `🔒 التذاكر المغلقة:`, value: `${closedTickets}` },
        ),
      ],
    });
  }
});
const fs = require("fs");

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  let ticketCount = 0;
  try {
    const data = fs.readFileSync("ticketCount.json");
    const jsonData = JSON.parse(data);
    ticketCount = jsonData.ticketCount;
  } catch (error) {
    console.error(error);
  }
  const ticketCategoryID = ca.ticketCategoryID;
  const adminRoleID = ca.adminRoleID;
  let idserver = ca.idserver;
  const ticketChannelName = `ticket-${ticketCount}`;

  if (interaction.customId === "create_ticket") {
    const authorId = interaction.user.id;
    const ticketDataS = JSON.parse(fs.readFileSync("tickets.json", "utf-8"));
    const existingTicket = ticketDataS.find(
      (ticket) => ticket.userId === authorId && ticket.open,
    );
    if (existingTicket) {
      await interaction.reply({
        content: ca.already_open_ticket_msg,
        ephemeral: true,
      });
      return;
    }
    const guild = client.guilds.cache.get(idserver);
    const adminRole = guild.roles.cache.get(adminRoleID);
    const ticketCategory = guild.channels.cache.get(ticketCategoryID);
    const ticketChannel = await guild.channels.create(ticketChannelName, {
      parent: ticketCategory,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          deny: ["VIEW_CHANNEL"],
        },
        {
          id: interaction.user.id,
          allow: ["VIEW_CHANNEL"],
        },
        {
          id: adminRole.id,
          allow: ["VIEW_CHANNEL", "SEND_MESSAGES"],
        },
      ],
    });

    const ticketEmbed = {
      title: `${ca.ticket_title_help}`,
      description: `${ca.ticket_msg_help}`,
      color: "#ff0000",
    };
    const ticketMessage = await ticketChannel.send({ embeds: [ticketEmbed] });

    const buttonRow = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("receive_ticket")
        .setLabel("المطالبة بالتذكرة")
        .setEmoji("🔗")
        .setStyle("PRIMARY"),
      new MessageButton()
        .setCustomId("close_ticket")
        .setLabel("إغلاق التذكرة")
        .setEmoji("🎟")
        .setStyle("SECONDARY"),
      new MessageButton()
        .setCustomId("delete_ticket")
        .setLabel("حذف التذكرة")
        .setStyle("DANGER")
        .setEmoji("🗑️"),
    );
    let ticketData = [];

    try {
      const ticketDataString = fs.readFileSync("tickets.json", "utf-8");
      ticketData = JSON.parse(ticketDataString);
    } catch (error) {
      console.error("Error reading ticket data:", error);
    }

    const newTicket = {
      userId: interaction.user.id,
      channelId: ticketChannel.id,
      open: true,
    };

    if (Array.isArray(ticketData)) {
      ticketData.push(newTicket);
    } else {
      ticketData = [newTicket];
    }

    await ticketMessage.edit({ components: [buttonRow] });

    await interaction.reply({
      content: `${ca.ticket_open_msg} ${ticketChannel}`,
      ephemeral: true,
    }); //

    fs.writeFileSync("tickets.json", JSON.stringify(ticketData));

    console.log("New ticket added:", newTicket);

    ticketCount++;

    const jsonData = { ticketCount };
    fs.writeFile("ticketCount.json", JSON.stringify(jsonData), (error) => {
      if (error) console.error(error);
    });
  } else if (interaction.customId === "close_ticket") {
    const adminRole = interaction.guild.roles.cache.get(adminRoleID);

    if (!interaction.member.roles.cache.some((e) => e.id === adminRole.id)) {
      await interaction.reply({
        content: "يمكن فقط للمستخدمين الذين لديهم دور المسؤول إغلاق التذاكر.",
        ephemeral: true,
      });
      return;
    }

    const ticketData = JSON.parse(fs.readFileSync("tickets.json", "utf-8"));
    const channelId = interaction.channel.id;
    const openadndeleted = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("open_ticket")
        .setLabel("تذكرة مفتوحة")
        .setEmoji("🔓")
        .setStyle("SECONDARY"),
      new MessageButton()
        .setCustomId("delete_ticket")
        .setLabel("حذف التذكرة")
        .setStyle("DANGER")
        .setEmoji("🗑️"),
    );
    const ticketIndex = ticketData.findIndex(
      (ticket) => ticket.channelId === channelId,
    );
    if (!ticketData[ticketIndex].open == true)
      return interaction.reply({
        content: "Ticket already Closed",
        ephemeral: true,
      });
    if (ticketIndex !== -1) {
      await interaction.reply({
        content: ca.closemsg,
        ephemeral: false,
        components: [openadndeleted],
      });
      ticketData[ticketIndex].open = false;

      interaction.channel.permissionOverwrites.set([
        {
          id: ticketData[ticketIndex].userId,
          deny: ["VIEW_CHANNEL"],
        },
        {
          id: adminRoleID,
          allow: ["VIEW_CHANNEL", "SEND_MESSAGES"],
        },
        {
          id: interaction.guildId,
          deny: ["VIEW_CHANNEL"],
        },
      ]);

      fs.writeFileSync("tickets.json", JSON.stringify(ticketData));
    }
  } else if (interaction.customId === "open_ticket") {
    const ticketData = JSON.parse(fs.readFileSync("tickets.json", "utf-8"));
    const ticketIndex = ticketData.findIndex(
      (ticket) => ticket.channelId === interaction.channel.id,
    );
    if (ticketData[ticketIndex].open) {
      return interaction.reply({
        content: "التذكرة مفتوحة بالفعل.",
        ephemeral: true,
      });
    }

    interaction.channel.permissionOverwrites.set([
      {
        id: ticketData[ticketIndex].userId,
        allow: ["VIEW_CHANNEL", "SEND_MESSAGES"],
      },
      {
        id: adminRoleID,
        allow: ["VIEW_CHANNEL", "SEND_MESSAGES"],
      },
      {
        id: interaction.guildId,
        deny: ["VIEW_CHANNEL"],
      },
    ]);

    await interaction.reply({
      content: "**🔓 | تم فتح التذكرة.**",
      ephemeral: false,
    });
    ticketData[ticketIndex].open = true;

    fs.writeFileSync("tickets.json", JSON.stringify(ticketData));
  } else if (interaction.customId === "receive_ticket") {
    const ticketChannel = interaction.channel;
    const adminRole = interaction.guild.roles.cache.get(adminRoleID);
    if (!interaction.member.roles.cache.some((e) => e.id === adminRole.id)) {
      await interaction.reply({
        content:
          "يمكن فقط للمستخدمين الذين لديهم دور المسؤول المطالبة بالتذاكر.",
        ephemeral: true,
      });
      return;
    }

    const claimedButton = new MessageActionRow().addComponents(
      new MessageButton()
        .setCustomId("receive_ticket")
        .setLabel(`بواسطة ${interaction.user.tag}`)
        .setStyle("SUCCESS")
        .setDisabled(true),
      new MessageButton()
        .setCustomId("close_ticket")
        .setLabel("إغلاق التذكرة")
        .setEmoji("🎟")
        .setStyle("SECONDARY"),
      new MessageButton()
        .setCustomId("delete_ticket")
        .setLabel("حذف التذكرة")
        .setStyle("DANGER")
        .setEmoji("🗑️"),
    );

    await interaction.deferUpdate();

    await interaction.editReply({ components: [claimedButton] });
    await interaction.followUp({
      content: `لقد حصلت على تذكرة لـ ${interaction.channel}`,
      ephemeral: true,
    });
  } else if (interaction.customId === "delete_ticket") {
    const adminRole = interaction.guild.roles.cache.get(adminRoleID);
    if (!interaction.member.roles.cache.some((e) => e.id === adminRole.id)) {
      await interaction.reply({
        content: "يمكن فقط للمستخدمين الذين لديهم دور المسؤول حذف التذاكر.",
        ephemeral: true,
      });
      return;
    }

    const ticketData = JSON.parse(fs.readFileSync("tickets.json", "utf-8"));
    const channelId = interaction.channel.id;
    interaction.channel.send({ content: "سيتم حذف التذكرة خلال 5 ثواني" });
    setTimeout(async () => {
      await interaction.channel.delete();
      const index = ticketData.findIndex(
        (ticket) => ticket.channelId === channelId,
      );
      if (index !== -1) {
        ticketData.splice(index, 1);
        fs.writeFileSync("tickets.json", JSON.stringify(ticketData));
      }
    }, 5000);
  }
});
client.login("process.env.token");
