const { React, getModuleByDisplayName, getModule } = require('powercord/webpack');
const { AsyncComponent } = require('powercord/components');
const { TextInput, Category, SwitchItem } = require('powercord/components/settings');
const FormText = AsyncComponent.from(getModuleByDisplayName('FormText'));
const FormTitle = AsyncComponent.from(getModuleByDisplayName('FormTitle'));
const Flex = AsyncComponent.from(getModuleByDisplayName('flex'));
const FlexChild = getModule(['flexChild'], false).flexChild;

module.exports = class Settings extends React.Component {
   constructor(props) {
      super();
   }

   render() {
      const { getSetting, updateSetting, toggleSetting } = this.props;
      return (
         <div>
            <SwitchItem
               note={'Display notifications when someone removes you from their friends list.'}
               value={getSetting('remove', true)}
               onChange={() => toggleSetting('remove')}
            >
               Remove
            </SwitchItem>
            <SwitchItem
               note={'Display notifications when you get kicked from a server.'}
               value={getSetting('kick', true)}
               onChange={() => toggleSetting('kick')}
            >
               Kick/Ban
            </SwitchItem>
            <SwitchItem
               note={'Display notifications when you get kicked from a group chat.'}
               value={getSetting('group', true)}
               onChange={() => toggleSetting('group')}
            >
               Group
            </SwitchItem>
            <SwitchItem
               note={'Display notifications when someone cancells their friend request.'}
               value={getSetting('friendCancel', true)}
               onChange={() => toggleSetting('friendCancel')}
            >
               Cancelled Friend Request
            </SwitchItem>
            <Category
               name={'Text'}
               description={'Customize the notifications the way you want.'}
               opened={getSetting('textExpanded', false)}
               onChange={() => updateSetting('textExpanded', !getSetting('textExpanded', false))}
            >
               <Flex style={{ justifyContent: 'center' }}>
                  <div className={FlexChild}>
                     <FormTitle>Remove & Cancel Variables</FormTitle>
                     <FormText style={{ textAlign: 'center' }}>
                        %username
                        <br></br>
                        %userid
                        <br></br>
                        %usertag
                     </FormText>
                  </div>
                  <div className={FlexChild}>
                     <FormTitle>Kick & Ban Variables</FormTitle>
                     <FormText style={{ textAlign: 'center' }}>
                        %servername
                        <br></br>
                        %serverid
                     </FormText>
                  </div>
                  <div className={FlexChild}>
                     <FormTitle>Group Variables</FormTitle>
                     <FormText style={{ textAlign: 'center' }}>
                        %groupname
                        <br></br>
                        %groupid
                     </FormText>
                  </div>
               </Flex>
               <br></br>
               <TextInput
                  value={getSetting('removeText', '%username#%usertag removed you as a friend.')}
                  onChange={(v) => updateSetting('removeText', v)}
                  note={'The text the notification will have when someone removes you.'}
               >
                  Removed Text
               </TextInput>
               <TextInput
                  value={getSetting('friendCancelText', '%username#%usertag cancelled their friend request.')}
                  onChange={(v) => updateSetting('friendCancelText', v)}
                  note={'The text the notification will have when someone cancells their friend request.'}
               >
                  Cancelled Friend Request Text
               </TextInput>
               <TextInput
                  value={getSetting('kickText', "You've been kicked/banned from %servername")}
                  onChange={(v) => updateSetting('kickText', v)}
                  note={'The text the notification will have when you get kicked/banned from a server.'}
               >
                  Kicked/Banned Text
               </TextInput>
               <TextInput
                  value={getSetting('groupText', "You've been removed from the group %groupname")}
                  onChange={(v) => updateSetting('groupText', v)}
                  note={'The text the notification will have when you get kicked from a group chat.'}
               >
                  Group Text
               </TextInput>
            </Category>
         </div>
      );
   }
};
