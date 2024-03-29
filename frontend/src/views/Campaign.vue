<template>
  <section class="campaign">
    <header class="columns page-header">
      <div class="column is-6">
        <p v-if="isEditing && data.status" class="tags">
          <b-tag v-if="isEditing" :class="data.status">
            {{ $t(`campaigns.status.${data.status}`) }}
          </b-tag>
          <b-tag v-if="data.type === 'optin'" :class="data.type">
            {{ $t('lists.optin') }}
          </b-tag>
          <span v-if="isEditing" class="has-text-grey-light is-size-7" :data-campaign-id="data.id">
            {{ $t('globals.fields.id') }}: {{ data.id }} /
            {{ $t('globals.fields.uuid') }}: {{ data.uuid }}
          </span>
        </p>
        <h4 v-if="isEditing" class="title is-4">{{ data.name }}</h4>
        <h4 v-else class="title is-4">{{ $t('campaigns.newCampaign') }}</h4>
      </div>

      <div class="column is-6">
        <div class="buttons">
          <b-field grouped v-if="isEditing && canEdit">
            <b-field expanded>
              <b-button expanded @click="() => onSubmit('update')" 
                :loading="loading.campaigns" type="is-primary"
                icon-left="content-save-outline" data-cy="btn-save">
                {{ $t('globals.buttons.saveChanges') }}
              </b-button>
            </b-field>
            <b-field expanded v-if="canStart">
              <b-button expanded @click="startCampaign" :loading="loading.campaigns" type="is-primary"
                icon-left="rocket-launch-outline" data-cy="btn-start">
                {{ $t('campaigns.start') }}
              </b-button>
            </b-field>
            <b-field expanded v-if="canSchedule">
              <b-button expanded @click="startCampaign" :loading="loading.campaigns" type="is-primary"
                icon-left="clock-start" data-cy="btn-schedule">
                {{ $t('campaigns.schedule') }}
              </b-button>
            </b-field>
          </b-field>
        </div>
      </div>
    </header>

    <b-loading :active="loading.campaigns"></b-loading>

    <b-tabs type="is-boxed" :animated="false" v-model="activeTab" @input="onTab">
      <b-tab-item :label="$tc('globals.terms.campaign')" label-position="on-border" value="campaign"
        icon="rocket-launch-outline">
        <section class="wrap">
          <div class="columns">
            <div class="column is-7">
              <form @submit.prevent="() => onSubmit(isNew ? 'create' : 'update')">
                <b-field :label="$t('globals.fields.name')" label-position="on-border">
                  <b-input :maxlength="200" :ref="'focus'" v-model="form.name" name="name" :disabled="!canEdit"
                    :placeholder="$t('globals.fields.name')" required></b-input>
                </b-field>

                <b-field :label="$t('campaigns.subject')" label-position="on-border">
                  <b-input :maxlength="200" v-model="form.subject" name="subject" :disabled="!canEdit"
                    :placeholder="$t('campaigns.subject')" required></b-input>
                </b-field>

                <b-field :label="$t('campaigns.fromAddress')" label-position="on-border">
                  <b-input :maxlength="200" v-model="form.fromEmail" name="from_email" :disabled="!canEdit"
                    :placeholder="$t('campaigns.fromAddressPlaceholder')" required></b-input>
                </b-field>

                <list-selector v-model="form.lists" :selected="form.lists" :all="lists.results" :disabled="!canEdit"
                  :label="$t('globals.terms.lists')" :placeholder="$t('campaigns.sendToLists')"></list-selector>

                <b-field :label="$tc('globals.terms.template')" label-position="on-border">
                  <b-select :placeholder="$tc('globals.terms.template')" v-model="form.templateId" name="template"
                    :disabled="!canEdit" required>
                    <template v-for="t in templates">
                      <option v-if="t.type === 'campaign'" :value="t.id" :key="t.id">{{ t.name }}</option>
                    </template>
                  </b-select>
                </b-field>

                <b-field :label="$tc('globals.terms.messenger')" label-position="on-border">
                  <b-select :placeholder="$tc('globals.terms.messenger')" v-model="form.messenger" name="messenger"
                    :disabled="!canEdit" required>
                    <option v-for="m in messengers" :value="m" :key="m">{{ m }}</option>
                  </b-select>
                </b-field>

                <b-field :label="$t('globals.terms.tags')" label-position="on-border">
                  <b-taginput v-model="form.tags" name="tags" :disabled="!canEdit" ellipsis icon="tag-outline"
                    :placeholder="$t('globals.terms.tags')" />
                </b-field>
                <hr />

                <div class="columns">
                  <div class="column is-4">
                    <b-field :label="$t('campaigns.sendLater')" data-cy="btn-send-later">
                      <b-switch v-model="form.sendLater" :disabled="!canEdit" />
                    </b-field>
                  </div>
                  <div class="column">
                    <br />
                    <b-field v-if="form.sendLater" data-cy="send_at"
                      :message="form.sendAtDate ? $utils.duration(Date(), form.sendAtDate) : ''">
                      <b-datetimepicker v-model="form.sendAtDate" :disabled="!canEdit"
                        :placeholder="$t('campaigns.dateAndTime')" icon="calendar-clock"
                        :timepicker="{ hourFormat: '24' }" :datetime-formatter="formatDateTime" horizontal-time-picker>
                      </b-datetimepicker>
                    </b-field>
                  </div>
                </div>

                <div>
                  <p class="has-text-right">
                    <a href="#" @click.prevent="onShowHeaders" data-cy="btn-headers">
                      <b-icon icon="plus" />{{ $t('settings.smtp.setCustomHeaders') }}
                    </a>
                  </p>
                  <b-field v-if="form.headersStr !== '[]' || isHeadersVisible" label-position="on-border"
                    :message="$t('campaigns.customHeadersHelp')">
                    <b-input v-model="form.headersStr" name="headers" type="textarea"
                      placeholder='[{"X-Custom": "value"}, {"X-Custom2": "value"}]' :disabled="!canEdit" />
                  </b-field>
                </div>
                <hr />

                <b-field v-if="isNew">
                  <b-button native-type="submit" type="is-primary" :loading="loading.campaigns" data-cy="btn-continue">
                    {{ $t('campaigns.continue') }}
                  </b-button>
                </b-field>
              </form>
            </div>
            <div class="column is-4 is-offset-1">
              <br />
              <div class="box">
                <h3 class="title is-size-6">{{ $t('campaigns.sendTest') }}</h3>
                <b-field :message="$t('campaigns.sendTestHelp')">
                  <b-taginput v-model="form.testEmails" :before-adding="$utils.validateEmail" :disabled="isNew" ellipsis
                    icon="email-outline" :placeholder="$t('campaigns.testEmails')" />
                </b-field>
                <b-field>
                  <b-button @click="() => onSubmit('test')" :loading="loading.campaigns" :disabled="isNew"
                    type="is-primary" icon-left="email-outline">
                    {{ $t('campaigns.send') }}
                  </b-button>
                </b-field>
              </div>
            </div>
          </div>
        </section>
      </b-tab-item>
      <!-- campaign -->

      <b-tab-item :label="$t('campaigns.content')" icon="text" :disabled="isNew" value="content">
        <!--  editor  -->
        <section class="editor">
          <div class="columns">
            <div class="column is-6">
            </div>
            <div class="column is-6 has-text-right">
              <b-button @click="onTogglePreview" type="is-primary" icon-left="file-find-outline" data-cy="btn-preview">
                {{ $t('campaigns.preview') }}
              </b-button>
            </div>
          </div>
          <template>
            <div id="builder" class="container">
              <EmailEditor
                :appearance="appearance"
                :min-height="minHeight"
                :project-id="projectId"
                :locale="locale"
                :tools="tools"
                :options="options"
                ref="emailEditor"
                v-on:load="editorLoaded"
                v-on:ready="editorReady"
                style="height: 100vh" />
            </div>
          </template>

          <!-- campaign preview //-->
          <campaign-preview v-if="isPreviewing" @close="onTogglePreview" type="campaign" 
          :id="data.id" :title="data.name"
            :templateId="form.templateId" :body="form.content.body"></campaign-preview>

        </section>
        <!--        <editor-->
        <!--          v-model="form.content"-->
        <!--          ref="editorRef"-->
        <!--          :id="data.id"-->
        <!--          :title="data.name"-->
        <!--          :uuid="data.uuid"-->
        <!--          :templateId="form.templateId"-->
        <!--          :contentType="data.contentType"-->
        <!--          :body="data.body"-->
        <!--          :disabled="!canEdit"-->
        <!--        />-->

        <div class="columns">
          <div class="column is-6">
            <p v-if="!isAttachFieldVisible" class="is-size-6 has-text-grey">
              <a href="#" @click.prevent="onShowAttachField()" data-cy="btn-attach">
                <b-icon icon="file-upload-outline" size="is-small" />
                {{ $t('campaigns.addAttachments') }}
              </a>
            </p>

            <b-field v-if="isAttachFieldVisible" :label="$t('campaigns.attachments')" label-position="on-border" expanded
              data-cy="media">
              <b-taginput v-model="form.media" name="media" ellipsis icon="tag-outline" ref="media" field="filename"
                @focus="onOpenAttach" :disabled="!canEdit" />
            </b-field>
          </div>
          <div class="column has-text-right">
            <p v-if="canEdit && form.content.contentType !== 'plain'" class="is-size-6 has-text-grey">
              <a v-if="form.altbody === null" href="#" @click.prevent="onAddAltBody">
                <b-icon icon="text" size="is-small" /> {{ $t('campaigns.addAltText') }}
              </a>
              <a v-else href="#" @click.prevent="$utils.confirm(null, onRemoveAltBody)">
                <b-icon icon="trash-can-outline" size="is-small" />
                {{ $t('campaigns.removeAltText') }}
              </a>
            </p>
          </div>
        </div>

        <div v-if="canEdit && form.content.contentType !== 'plain'" class="alt-body">
          <b-input v-if="form.altbody !== null" v-model="form.altbody" type="textarea" :disabled="!canEdit" />
        </div>
      </b-tab-item><!-- content -->

      <b-tab-item :label="$t('campaigns.archive')" icon="newspaper-variant-outline" value="archive" :disabled="isNew">
        <section class="wrap">
          <b-field :label="$t('campaigns.archiveEnable')" data-cy="btn-archive" :message="$t('campaigns.archiveHelp')">
            <div class="columns">
              <div class="column">
                <b-switch data-cy="btn-archive" v-model="form.archive" :disabled="!canArchive" />
              </div>
              <div class="column is-12">
                <a :href="`${settings['app.root_url']}/archive/${data.uuid}`" target="_blank"
                  :class="{ 'has-text-grey-light': !form.archive }">
                  <b-icon icon="link-variant" />
                </a>
              </div>
            </div>
          </b-field>

          <div class="columns">
            <div class="column is-8">
              <b-field :label="$tc('globals.terms.template')" label-position="on-border">
                <b-select :placeholder="$tc('globals.terms.template')" v-model="form.archiveTemplateId" name="template"
                  :disabled="!canArchive || !form.archive" required>
                  <template v-for="t in templates">
                    <option v-if="t.type === 'campaign'" :value="t.id" :key="t.id">{{ t.name }}</option>
                  </template>
                </b-select>
              </b-field>
            </div>

            <div class="column has-text-right">
              <a v-if="!this.form.archiveMetaStr || this.form.archiveMetaStr === '{}'" class="button" href="#"
                @click.prevent="onFillArchiveMeta">{}</a>
            </div>
          </div>
          <b-field :label="$t('campaigns.archiveMeta')" :message="$t('campaigns.archiveMetaHelp')"
            label-position="on-border">
            <b-input v-model="form.archiveMetaStr" name="archive_meta" type="textarea" data-cy="archive-meta"
              :disabled="!canArchive || !form.archive" rows="20" />
          </b-field>

          <b-field v-if="!canEdit && canArchive">
            <b-button @click="onUpdateCampaignArchive" :loading="loading.campaigns" type="is-primary"
              icon-left="content-save-outline" data-cy="btn-archive-save">
              {{ $t('globals.buttons.saveChanges') }}
            </b-button>
          </b-field>
        </section>
      </b-tab-item><!-- archive -->
    </b-tabs>

    <b-modal scroll="keep" :aria-modal="true" :active.sync="isAttachModalOpen" :width="900">
      <div class="modal-card content" style="width: auto">
        <section expanded class="modal-card-body">
          <media is-modal @selected="onAttachSelect" />
        </section>
      </div>
    </b-modal>
  </section>
</template>

<script>
/* eslint-disable */

import Vue from 'vue';
import { mapState } from 'vuex';
import dayjs from 'dayjs';
import htmlToPlainText from 'textversionjs';
import { EmailEditor } from 'vue-email-editor';
import CampaignPreview from '../components/CampaignPreview.vue';
import Media from '../views/Media.vue';

import ListSelector from '../components/ListSelector.vue';
import Editor from '../components/Editor.vue';

const TABS = ['campaign', 'content', 'archive'];

export default Vue.extend({
  components: {
    CampaignPreview,
    ListSelector,
    EmailEditor,
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
        content: { contentType: 'richtext', altbody: '', body: '' },
        altbody: null,
        media: [],

        // Parsed Date() version of send_at from the API.
        sendAtDate: null,
        sendLater: false,
        archive: false,
        archiveMetaStr: '{}',
        archiveMeta: {},
        testEmails: [],

        //builder
        altbody: '',
        format: '',
        body: '',
        radioFormat: '',
      },

      // Builder
      isPreviewing: false,
      isMediaVisible: false,

      minHeight: '1000px',
      locale: 'en',
      projectId: 0,
      tools: {
        image: {
          enabled: true,
        },
      },
      options: {},
      displayMode: 'email',
      appearance: {
        theme: 'light',
        panels: {
          tools: {
            dock: 'left',
          },
        },
      },
    };
  },

  methods: {
    formatDateTime(s) {
      return dayjs(s).format('YYYY-MM-DD HH:mm');
    },

    onAddAltBody() {
      this.form.altbody = htmlToPlainText(this.form.content.altbody);
    },

    onRemoveAltBody() {
      // this.form.altbody = null;
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
      return this.data.altbody !== this.form.content.altbody
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

          // The structure that is populated by editor input event.
          content: { contentType: data.contentType, altbody: data.altbody, body: '' },
        };
        // console.log('get campaign');
        // console.log('get campaign', this.form);
        this.form.content.body = this.convertToHtml();

        // console.log('the form in get campaign', this.form.content.altbody === this.form.altbody);

        this.editorLoaded();

        // console.log('the form in get campaign', this.form.content.altbody === this.form.altbody);
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
      });
    },

    async sendTest() {
      await new Promise((resolve, reject) => {
        this.$refs.emailEditor.editor.exportHtml((data) => {
          this.form.content.body = data.html;
          resolve();
        });
      });

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
        body: this.form.content.body,
        altbody: this.form.altbody,
        subscribers: this.form.testEmails,
        media: this.form.media.map((m) => m.id),
      };

      data.body = this.form.content.body;

      // console.log('data.body', data.body);

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
      // console.log('start updating');

      await new Promise((resolve, reject) => {
        this.$refs.emailEditor.editor.saveDesign((design) => {
          this.form.content.altbody = JSON.stringify(design, null, 2);
          // console.log('save async');
          // console.log('save async', this.form.content.altbody);
          resolve();
        });
      });

      await new Promise((resolve, reject) => {
        this.$refs.emailEditor.editor.exportHtml((data) => {
          this.form.content.body = data.html;
          // console.log('update async');
          resolve();
        });
      });

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
        altbody: this.form.content.altbody,
        archive: this.form.archive,
        archive_template_id: this.form.archiveTemplateId,
        archive_meta: this.form.archiveMeta,
        media: this.form.media.map((m) => m.id),
      };

      // console.log('update', data.altbody === this.form.content.altbody);

      let typMsg = 'globals.messages.updated';
      if (typ === 'start') {
        typMsg = 'campaigns.started';
      }

      // This promise is used by startCampaign to first save before starting.
      return new Promise((resolve) => {
        this.$api.updateCampaign(this.data.id, data).then((d) => {
          this.data = d;
          this.$utils.toast(this.$t(typMsg, { name: d.name }));
          // console.log('promise in update');
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

    // builder editor
    editorLoaded() {
      this.$refs.emailEditor.editor.loadDesign(JSON.parse(this.form.content.altbody));
    },

    editorReady() {
      // console.log('editorReady');
    },

    convertToHtml() {
      new Promise((resolve) => {
        this.$refs.emailEditor.editor.exportHtml((data) => {
          this.form.content.body = data.html;
          resolve();
        });
      });

      return this.form.content.body;
    },

    async onEditorChange() {
      new Promise(async (resolve) => {
        await this.$refs.emailEditor.editor.saveDesign((design) => {
          this.form.content.altbody = JSON.stringify(design, null, 2);
          // console.log('this.form.content.body editor save', this.form.content.altbody);
        });
      });

      const htmlData = new Promise((resolve) => {
        this.$refs.emailEditor.editor.exportHtml((data) => {
          this.form.content.body = data.html;
          resolve();
        });
      });
    },

    async onTogglePreview() {
      await new Promise((resolve) => {
        this.$refs.emailEditor.editor.exportHtml((data) => {
          this.form.content.body = data.html;
          // console.log('test');
          resolve();
        });
      });

      this.isPreviewing = !this.isPreviewing;
    },
  },

  computed: {
    ...mapState(['settings', 'loading', 'lists', 'templates', 'serverConfig']),

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
      this.form.content.altbody = d.altbody;
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

    this.$nextTick(() => {
      this.$refs.focus.focus();
    });
  },
});
</script>

<style lang="scss">
.builder-container {
  display: flex;
  flex-wrap: wrap;
}

.builder-column {
  flex: 1;
  margin: 10px;
  padding: 20px;
  border: 1px solid #ccc;
}

.builder-section {
  height: 200px;
  overflow-y: auto;
}
</style>
