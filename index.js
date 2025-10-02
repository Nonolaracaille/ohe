require("dotenv").config();
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, Events, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

client.once("ready", async () => {
  console.log(`🤖 Connecté en tant que ${client.user.tag}`);

  try {
    // Récupère le salon où envoyer le message
    const channelId = process.env.CHANNEL_ID; // ID du salon
    const channel = await client.channels.fetch(channelId);

    if (!channel) {
      console.error("Salon introuvable !");
      return;
    }

    // Crée les boutons
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("connecter")
          .setLabel("Connecter")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("deconnecter")
          .setLabel("Déconnecter")
          .setStyle(ButtonStyle.Danger)
      );

    await channel.send({
      content: "Cliquez sur **Connecter** pour entrer le mot de passe ou sur **Déconnecter** pour retirer l’accès :",
      components: [row],
    });

    console.log("✅ Message avec boutons envoyé !");
  } catch (err) {
    console.error("Erreur lors de l'envoi du message :", err);
  }
});

// Gestion des boutons
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isButton()) return;

  const guild = interaction.guild;
  const member = await guild.members.fetch(interaction.user.id);
  const role = guild.roles.cache.get(process.env.ROLE_ID);

  if (interaction.customId === "connecter") {
    const modal = new ModalBuilder()
      .setCustomId("modal_login")
      .setTitle("Connexion");

    const input = new TextInputBuilder()
      .setCustomId("motdepasse")
      .setLabel("Entrez le mot de passe")
      .setStyle(TextInputStyle.Short)
      .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
  }

  if (interaction.customId === "deconnecter") {
    if (!role) return interaction.reply({ content: "⚠️ Rôle introuvable.", ephemeral: true });

    try {
      await member.roles.remove(role);
      interaction.reply({ content: "🛑 Accès retiré.", ephemeral: true });
      console.log(`${member.user.tag} a été déconnecté.`);
    } catch (err) {
      console.error(err);
      interaction.reply({ content: "❌ Impossible de retirer le rôle.", ephemeral: true });
    }
  }
});

// Gestion du modal
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.type !== InteractionType.ModalSubmit) return;
  if (interaction.customId !== "modal_login") return;

  const guild = interaction.guild;
  const member = await guild.members.fetch(interaction.user.id);
  const inputPassword = interaction.fields.getTextInputValue("motdepasse");
  const role = guild.roles.cache.get(process.env.ROLE_ID);

  if (inputPassword === process.env.PASSWORD_SECRET) {
    if (!role) return interaction.reply({ content: "⚠️ Rôle introuvable.", ephemeral: true });

    try {
      await member.roles.add(role);
      await interaction.reply({ content: "✅ Mot de passe correct ! Accès accordé pour 10 minutes.", ephemeral: true });
      console.log(`${member.user.tag} a reçu le rôle temporaire.`);

      setTimeout(async () => {
        try {
          await member.roles.remove(role);
          console.log(`🕒 Rôle retiré à ${member.user.tag}`);
        } catch (err) {
          console.error(err);
        }
      }, 600000); // 10 minutes
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "❌ Impossible d’ajouter le rôle.", ephemeral: true });
    }
  } else {
    await interaction.reply({ content: "❌ Mot de passe incorrect.", ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
