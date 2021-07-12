const { Plugin } = require('powercord/entities');
const { inject, uninject } = require('powercord/injector');
const { FluxDispatcher: Dispatcher, getModule } = require('powercord/webpack');
const Settings = require('./components/Settings');
const { getCurrentUser, getUser } = getModule(['getCurrentUser', 'getUser'], false);
const { getGuilds } = getModule(['getGuilds'], false);
const { getChannels } = getModule(['getChannels'], false);
const ChannelStore = getModule(['openPrivateChannel'], false);

module.exports = class RelationshipsNotifier extends Plugin {
   async startPlugin() {
      powercord.api.settings.registerSettings('relationships-notifier', {
         category: this.entityID,
         label: 'Relationships Notifier',
         render: Settings
      });

      this.cachedGroups = [...Object.values(getChannels())].filter((c) => c.type === 3);
      this.cachedGuilds = [...Object.values(getGuilds())];

      Dispatcher.subscribe('RELATIONSHIP_REMOVE', this.relationshipRemove);
      Dispatcher.subscribe('GUILD_MEMBER_REMOVE', this.memberRemove);
      Dispatcher.subscribe('GUILD_CREATE', this.guildCreate);
      Dispatcher.subscribe('CHANNEL_CREATE', this.channelCreate);
      Dispatcher.subscribe('CHANNEL_DELETE', this.channelDelete);

      this.mostRecentlyRemovedID = null;
      this.mostRecentlyLeftGuild = null;
      this.mostRecentlyLeftGroup = null;

      const relationshipModule = await getModule(['removeRelationship']);
      inject('rn-relationship-check', relationshipModule, 'removeRelationship', (args, res) => {
         this.mostRecentlyRemovedID = args[0];
         return res;
      });

      const leaveGuild = await getModule(['leaveGuild']);
      inject('rn-guild-leave-check', leaveGuild, 'leaveGuild', (args, res) => {
         this.mostRecentlyLeftGuild = args[0];
         this.removeGuildFromCache(args[0]);
         return res;
      });

      const closePrivateChannel = await getModule(['closePrivateChannel']);
      inject('rn-group-check', closePrivateChannel, 'closePrivateChannel', (args, res) => {
         this.mostRecentlyLeftGroup = args[0];
         this.removeGroupFromCache(args[0]);
         return res;
      });
   }

   pluginWillUnload() {
      powercord.api.settings.unregisterSettings('relationships-notifier');
      uninject('rn-relationship-check');
      uninject('rn-guild-join-check');
      uninject('rn-guild-leave-check');
      uninject('rn-group-check');
      Dispatcher.unsubscribe('RELATIONSHIP_REMOVE', this.relationshipRemove);
      Dispatcher.unsubscribe('GUILD_MEMBER_REMOVE', this.memberRemove);
      Dispatcher.unsubscribe('GUILD_CREATE', this.guildCreate);
      Dispatcher.unsubscribe('CHANNEL_CREATE', this.channelCreate);
      Dispatcher.unsubscribe('CHANNEL_DELETE', this.channelDelete);
   }

   guildCreate = (data) => {
      this.cachedGuilds.push(data.guild);
   };

   channelCreate = (data) => {
      if ((data.channel && data.channel.type !== 3) || this.cachedGroups.find((g) => g.id === data.channel.id)) return;
      this.cachedGroups.push(data.channel);
   };

   channelDelete = (data) => {
      if ((data.channel && data.channel.type !== 3) || !this.cachedGroups.find((g) => g.id === data.channel.id)) return;
      let channel = this.cachedGroups.find((g) => g.id == data.channel.id);
      if (!channel || channel === null) return;
      this.removeGroupFromCache(channel.id);
      if (this.settings.get('group', true)) {
         this.fireToast('group', channel, "You've been removed from the group %groupname");
      }
   };

   removeGroupFromCache = (id) => {
      const index = this.cachedGroups.indexOf(this.cachedGroups.find((g) => g.id == id));
      if (index == -1) return;
      this.cachedGroups.splice(index, 1);
   };

   removeGuildFromCache = (id) => {
      const index = this.cachedGuilds.indexOf(this.cachedGuilds.find((g) => g.id == id));
      if (index == -1) return;
      this.cachedGuilds.splice(index, 1);
   };

   relationshipRemove = (data) => {
      if (data.relationship.type === 4) return;
      if (this.mostRecentlyRemovedID === data.relationship.id) {
         this.mostRecentlyRemovedID = null;
         return;
      }
      let user = getUser(data.relationship.id);
      if (!user || user === null) return;
      switch (data.relationship.type) {
         case 1:
            if (this.settings.get('remove', true)) {
               this.fireToast('remove', user, '%username#%usertag removed you as a friend.');
            }
            break;
         case 3:
            if (this.settings.get('friendCancel', true)) {
               this.fireToast('friendCancel', user, '%username#%usertag cancelled their friend request.');
            }
            break;
      }
      this.mostRecentlyRemovedID = null;
   };

   memberRemove = (data) => {
      if (this.mostRecentlyLeftGuild === data.guildId) {
         this.mostRecentlyLeftGuild = null;
         return;
      }
      if (data.user.id !== getCurrentUser().id) return;
      let guild = this.cachedGuilds.find((g) => g.id == data.guildId);
      if (!guild || guild === null) return;
      this.removeGuildFromCache(guild.id);
      if (this.settings.get('kick', true)) {
         this.fireToast('kick', guild, "You've been kicked/banned from %servername");
      }
      this.mostRecentlyLeftGuild = null;
   };

   random() {
      let result = '';
      let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      for (let i = 0; i < characters.length; i++) {
         result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
   }

   fireToast(type, instance, defaults) {
      let buttons = null;

      if (['friendCancel', 'remove'].includes(type)) buttons = [{
         text: 'Open DM',
         color: 'brand',
         size: 'small',
         look: 'outlined',
         onClick: () => {
            ChannelStore.openPrivateChannel(instance.id);
         }
      }];

      let text = this.replaceWithVars(type, this.settings.get(`${type}Text`, defaults), instance);

      if (this.settings.get('appToasts', true)) {
         if (this.settings.get('appToastsFocus', true) && document.hasFocus()) {
            powercord.api.notices.sendToast(`rn_${this.random(20)}`, {
               header: text,
               type: 'danger',
               buttons
            });
         }
      }


      if (this.settings.get('desktopNotif', true)) {
         if (!document.hasFocus() || this.settings.get('desktopNotifFocus', false)) {
            new Notification('Relationships Notifier', {
               body: text,
               icon: (instance.icon && `https://cdn.discordapp.com/${instance.type == 3 ?
                  'channel-icons' :
                  'icons'
                  }/${instance.id}/${instance.icon}.${instance.icon.startsWith('a_') ?
                     'gif' :
                     'png'
                  }?size=4096`
               ) ?? instance.getAvatarURL?.()
            });
         }
      }
   };

   replaceWithVars(type, text, object) {
      if (type === 'remove' || type === 'friendCancel') {
         return text.replace('%username', object.username).replace('%usertag', object.discriminator).replace('%userid', object.id);
      } else if (type === 'kick') {
         return text.replace('%servername', object.name).replace('%serverid', object.id);
      } else if (type === 'group') {
         let name = object.name.length === 0 ? object.recipients.map((id) => getUser(id).username).join(', ') : object.name;
         return text.replace('%groupname', name).replace('%groupid', object.id);
      } else {
         let name = object.name.length === 0 ? object.recipients.map((id) => getUser(id).username).join(', ') : object.name;
         return text.replace('%name', name);
      }
   }
};
