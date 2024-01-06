import Vue from 'vue';
import { mapState } from 'vuex';
import dayjs from 'dayjs';
import htmlToPlainText from 'textversionjs';
import { TABS } from './Campaign.vue';

export default Vue.extend({
components: {
ListSelector,
Editor,
Media,
},

data() {
return {
isNew: false,
isEditing: false,
isHeadersVisible: false,
isAttachFieldVisible: false,
isAttachModalOpen: false,
activeTab: 0,

data: {},

// IDs from ?list_id query param.
selListIDs: [],

// Binds form input values.
form: {
name: '',
subject: '',
fromEmail: '',
headersStr: '[]',
headers: [],
messenger: 'email',
templateId: 0,
lists: [],
tags: [],
sendAt: null,
content: { contentType: 'richtext', body: '', htmlBody: '' },
altbody: null,
media: [],

// Parsed Date() version of send_at from the API.
sendAtDate: null,
sendLater: false,
archive: false,
archiveMetaStr: '{}',
archiveMeta: {},
testEmails: [],
},
};
},

methods: {
formatDateTime(s) {
return dayjs(s).format('YYYY-MM-DD HH:mm');
},

onAddAltBody() {
this.form.altbody = htmlToPlainText(this.form.content.body);
},

onRemoveAltBody() {
this.form.altbody = null;
},

onShowHeaders() {
this.isHeadersVisible = !this.isHeadersVisible;
},

onShowAttachField() {
this.isAttachFieldVisible = true;
this.$nextTick(() => {
this.$refs.media.focus();
});
},

onOpenAttach() {
this.isAttachModalOpen = true;
},

onAttachSelect(o) {
if (this.form.media.some((m) => m.id === o.id)) {
return;
}

this.form.media.push(o);
},

isUnsaved() {
return this.data.body !== this.form.content.body
|| this.data.contentType !== this.form.content.contentType;
},

onTab(t) {
const tab = TABS[t];
if (tab === 'content' && window.tinymce && window.tinymce.editors.length > 0) {
this.$nextTick(() => {
window.tinymce.editors[0].focus();
});
}
},

onFillArchiveMeta() {
const archiveStr = `{"email": "email@domain.com", "name": "${this.$t('globals.fields.name')}", "attribs": {}}`;
this.form.archiveMetaStr = this.$utils.getPref('campaign.archiveMetaStr') || JSON.stringify(JSON.parse(archiveStr), null, 4);
},

onSubmit(typ) {
// Validate custom JSON headers.
if (this.form.headersStr && this.form.headersStr !== '[]') {
try {
this.form.headers = JSON.parse(this.form.headersStr);
} catch (e) {
this.$utils.toast(e.toString(), 'is-danger');
return;
}
} else {
this.form.headers = [];
}

// Validate archive JSON body.
if (this.form.archive && this.form.archiveMetaStr) {
try {
this.form.archiveMeta = JSON.parse(this.form.archiveMetaStr);
} catch (e) {
this.$utils.toast(e.toString(), 'is-danger');
return;
}
} else {
this.form.archiveMeta = {};
}

switch (typ) {
case 'create':
this.createCampaign();
break;
case 'test':
this.sendTest();
break;
default:
this.updateCampaign();
this.$refs.editorRef.editorLoaded();
break;
}
},

getCampaign(id) {
return this.$api.getCampaign(id).then((data) => {
this.data = data;
// console.log(data, this.form);
this.form = {
...this.form,
...data,
headersStr: JSON.stringify(data.headers, null, 4),
archiveMetaStr: data.archiveMeta ? JSON.stringify(data.archiveMeta, null, 4) : '{}',
content: {
contentType: '',
body: '',
htmlBody: '',
},
};

// console.log('the form in get campaign: (before assign)', this.form.content);
// The structure that is populated by editor input event.
// content: { contentType: data.contentType, body: data.body, htmlBody: 'body' },
this.form.content = {
contentType: data.contentType,
body: data.body,
htmlBody: 'body',
};

console.log('the form in get campaign: (after assign)', this.form.content);
// console.log('the form in get campaign: (after assign)', this.form);
this.isAttachFieldVisible = this.form.media.length > 0;

this.form.media = this.form.media.map((f) => {
if (!f.id) {
return { ...f, filename: `❌ ${f.filename}` };
}
return f;
});

if (data.sendAt !== null) {
this.form.sendLater = true;
this.form.sendAtDate = dayjs(data.sendAt).toDate();
}

this.$refs.editorRef.editorLoaded();
});
},

sendTest() {
const data = {
id: this.data.id,
name: this.form.name,
subject: this.form.subject,
lists: this.form.lists.map((l) => l.id),
from_email: this.form.fromEmail,
messenger: this.form.messenger,
type: 'regular',
headers: this.form.headers,
tags: this.form.tags,
template_id: this.form.templateId,
content_type: this.form.content.contentType,
body: this.form.content.htmlbody,
altbody: this.form.content.contentType !== 'plain' ? this.form.altbody : null,
subscribers: this.form.testEmails,
media: this.form.media.map((m) => m.id),
};

this.$api.testCampaign(data).then(() => {
this.$utils.toast(this.$t('campaigns.testSent'));
});
return false;
},

createCampaign() {
const data = {
name: this.form.name,
subject: this.form.subject,
lists: this.form.lists.map((l) => l.id),
from_email: this.form.fromEmail,
content_type: 'richtext',
messenger: this.form.messenger,
type: 'regular',
tags: this.form.tags,
send_later: this.form.sendLater,
send_at: this.form.sendLater ? this.form.sendAtDate : null,
headers: this.form.headers,
template_id: this.form.templateId,
media: this.form.media.map((m) => m.id),
// body: this.form.body,
};

this.$api.createCampaign(data).then((d) => {
this.$router.push({ name: 'campaign', hash: '#content', params: { id: d.id } });
});
return false;
},

async updateCampaign(typ) {
const check = this.form.content.body;
await this.$refs.editorRef.onEditorChange();

console.log('update>>>>', check === this.form.content.body);

const data = {
name: this.form.name,
subject: this.form.subject,
lists: this.form.lists.map((l) => l.id),
from_email: this.form.fromEmail,
messenger: this.form.messenger,
type: 'regular',
tags: this.form.tags,
send_later: this.form.sendLater,
send_at: this.form.sendLater ? this.form.sendAtDate : null,
headers: this.form.headers,
template_id: this.form.templateId,
content_type: this.form.content.contentType,
body: this.form.content.body,
altbody: this.form.content.contentType !== 'plain' ? this.form.altbody : null,
archive: this.form.archive,
archive_template_id: this.form.archiveTemplateId,
archive_meta: this.form.archiveMeta,
media: this.form.media.map((m) => m.id),
};

let typMsg = 'globals.messages.updated';
if (typ === 'start') {
typMsg = 'campaigns.started';
}

// This promise is used by startCampaign to first save before starting.
return new Promise((resolve) => {
this.$api.updateCampaign(this.data.id, data).then((d) => {
this.data = d;
this.$utils.toast(this.$t(typMsg, { name: d.name }));
resolve();
});
});
},

onUpdateCampaignArchive() {
if (this.isEditing && this.canEdit) {
return;
}

const data = {
archive: this.form.archive,
archive_template_id: this.form.archiveTemplateId,
archive_meta: JSON.parse(this.form.archiveMetaStr),
};

this.$api.updateCampaignArchive(this.data.id, data);
},

// Starts or schedule a campaign.
startCampaign() {
if (!this.canStart && !this.canSchedule) {
return;
}

this.$utils.confirm(null,
() => {
// First save the campaign.
this.updateCampaign().then(() => {
// Then start/schedule it.
let status = '';
if (this.canStart) {
status = 'running';
} else if (this.canSchedule) {
status = 'scheduled';
} else {
return;
}

this.$api.changeCampaignStatus(this.data.id, status).then(() => {
this.$router.push({ name: 'campaigns' });
});
});
});
},
},

computed: {
...mapState(['settings', 'loading', 'lists', 'templates']),

canEdit() {
return this.isNew
|| this.data.status === 'draft' || this.data.status === 'scheduled';
},

canSchedule() {
return this.data.status === 'draft' && this.data.sendAt;
},

canStart() {
return this.data.status === 'draft' && !this.data.sendAt;
},

canArchive() {
return this.data.status !== 'cancelled' && this.data.type !== 'optin';
},

selectedLists() {
if (this.selListIDs.length === 0 || !this.lists.results) {
return [];
}

return this.lists.results.filter((l) => this.selListIDs.indexOf(l.id) > -1);
},

messengers() {
return ['email', ...this.settings.messengers.map((m) => m.name)];
},
},

beforeRouteLeave(to, from, next) {
if (this.isUnsaved()) {
this.$utils.confirm(this.$t('globals.messages.confirmDiscard'), () => next(true));
return;
}
next(true);
},

watch: {
selectedLists() {
this.form.lists = this.selectedLists;
},

data(d) {
// console.log('campaign watch before', this.form.content.body === d.body);
this.form.content.body = d.body;
// console.log('campaign watch after', this.form.content.body === d.body);
// this.form.radioFormat = f;
console.log('data watch');
// this.onEditorChange();
},
},

mounted() {
window.onbeforeunload = () => this.isUnsaved() || null;

// Fill default form fields.
this.form.fromEmail = this.settings['app.from_email'];

// New campaign.
const { id } = this.$route.params;
if (id === 'new') {
this.isNew = true;

if (this.$route.query.list_id) {
// Multiple list_id query params.
let strIds = [];
if (typeof this.$route.query.list_id === 'object') {
strIds = this.$route.query.list_id;
} else {
strIds = [this.$route.query.list_id];
}

this.selListIDs = strIds.map((v) => parseInt(v, 10));
}
} else {
const intID = parseInt(id, 10);
if (intID <= 0 || Number.isNaN(intID)) {
this.$utils.toast(this.$t('campaigns.invalid'));
return;
}

this.isEditing = true;
}

// Get templates list.
this.$api.getTemplates().then((data) => {
if (data.length > 0) {
if (!this.form.templateId) {
this.form.templateId = data.find((i) => i.isDefault === true).id;
}
}
});

// Fetch campaign.
if (this.isEditing) {
this.getCampaign(id).then(() => {
if (this.$route.hash === '#content') {
this.activeTab = 1;
}
});
} else {
this.form.messenger = 'email';
}

// this.form.content.body = this.data.body;
// this.$refs.editorRef.onEditorChange();
// this.$refs.editorRef.editorLoaded();
this.$nextTick(() => {
this.$refs.focus.focus();
});
},
});
