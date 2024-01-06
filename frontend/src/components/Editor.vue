<template>
  <!-- Two-way Data-Binding -->
  <section class="editor">
    <div class="columns">
      <div class="column is-6">
      </div>
      <div class="column is-6 has-text-right">
          <b-button @click="onTogglePreview" type="is-primary"
            icon-left="file-find-outline" data-cy="btn-preview">
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
          style="height: 100vh"
        />
      </div>
    </template>

    <!-- campaign preview //-->
    <campaign-preview v-if="isPreviewing"
      @close="onTogglePreview"
      type="campaign"
      :id="id"
      :title="title"
      :templateId="templateId"
      :body="form.htmlBody"></campaign-preview>

    <!-- image picker -->
    <b-modal scroll="keep" :aria-modal="true" :active.sync="isMediaVisible" :width="900">
      <div class="modal-card content" style="width: auto">
        <section expanded class="modal-card-body">
          <media is-modal @selected="onMediaSelect" />
        </section>
      </div>
    </b-modal>
  </section>
</template>

<script>
/* eslint-disable */
import { mapState } from 'vuex';
import { indent } from 'indent.js';
import { EmailEditor } from 'vue-email-editor';
import CampaignPreview from './CampaignPreview.vue';
import Media from '../views/Media.vue';

// Map of listmonk language codes to corresponding TinyMCE language files.
// const LANGS = {
//   'cs-cz': 'cs',
//   de: 'de',
//   es: 'es_419',
//   fr: 'fr_FR',
//   it: 'it_IT',
//   pl: 'pl',
//   pt: 'pt_PT',
//   'pt-BR': 'pt_BR',
//   ro: 'ro',
//   tr: 'tr',
// };

export default {
  components: {
    Media,
    CampaignPreview,
    EmailEditor,
    // TinyMce,
  },

  props: {
    value: Object,
    id: Number,
    uuid: String,
    title: String,
    body: String,
    contentType: String,
    templateId: {
      type: Number,
      default: 0,
    },
    disabled: Boolean,
  },

  data() {
    return {
      isPreviewing: false,
      isMediaVisible: false,
      isEditorFullscreen: false,
      isReady: false,
      isRichtextReady: false,
      isRichtextSourceVisible: false,
      isInsertHTMLVisible: false,
      insertHTMLSnippet: '',
      isTrackLink: false,
      richtextConf: {},
      richTextSourceBody: '',
      form: {
        body: this.value.body || '',
        format: this.contentType,
        htmlBody: '',

        // Model bound to the checkboxes. This changes on click of the radio,
        // but is reverted by the change handler if the user cancels the
        // conversion warning. This is used to set the value of form.format
        // that the editor uses to render content.
        radioFormat: this.contentType,
      },

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
      // Last position of the cursor in the editor before the media popup
      // was opened. This is used to insert media on selection from the poup
      // where the caret may be lost.
      lastSel: null,
    };
  },

  methods: {
    editorLoaded() {
      console.log(this.value);
      // console.log('this.body', this.body);

      new Promise ((resolve) => {
        this.$refs.emailEditor.editor.loadDesign(JSON.parse(this.value.body));
        resolve(); 
      });
      
      // this.onEditorChange();
      console.log('editorLoaded');
    },
    // called when the editor has finished loading
    editorReady() {
      // console.log('editorReady');
      // this.onEditorChange();
    },

    onEditorChange() {
      // The parent's v-model gets { contentType, body }.
      console.log('on Editor change');
      new Promise((resolve) => {
        this.$refs.emailEditor.editor.saveDesign((design) => {
          const jsonData = JSON.stringify(design, null, 2);
          this.form.body = jsonData;
          resolve();
        });
      });

      new Promise((resolve) => {
        this.$refs.emailEditor.editor.exportHtml((data) => {
          this.form.htmlBody = data.html;
          // console.log('test');
          resolve();
        });
      });

      this.$emit('input', { contentType: this.form.format, body: this.form.body, htmlBody: this.form.htmlBody });

      return { contentType: this.form.format, body: this.form.body, htmlBody: this.form.htmlBody };
    },

    onTogglePreview() {
      const htmlData = new Promise((resolve) => {
        this.$refs.emailEditor.editor.exportHtml((data) => {
          this.form.htmlBody = data.html;
          // console.log('test');
          resolve();
        });
      });

      this.isPreviewing = !this.isPreviewing;
    },

    onMediaSelect(media) {
      this.runTinyMceImageCallback(media.url);
    },

    beautifyHTML(str) {
      // Pad all tags with linebreaks.
      let s = this.trimLines(str.replace(/(<(?!(\/)?a|span)([^>]+)>)/ig, '\n$1\n'), true);

      // Remove extra linebreaks.
      s = s.replace(/\n+/g, '\n');

      return indent.html(s, { tabString: '  ' }).trim();
    },

    trimLines(str, removeEmptyLines) {
      const out = str.split('\n');
      for (let i = 0; i < out.length; i += 1) {
        const line = out[i].trim();
        if (removeEmptyLines) {
          out[i] = line;
        } else if (line === '') {
          out[i] = '';
        }
      }

      return out.join('\n').replace(/\n\s*\n\s*\n/g, '\n\n');
    },
  },

  mounted() {
    // this.editorLoaded();
  },

  computed: {
    ...mapState(['serverConfig']),
  },

  watch: {
    contentType(f) {
      this.form.format = f;
      this.form.radioFormat = f;
      // console.log('contentType watch');
      // this.onEditorChange();
    },

    body(b) {
      // console.log('in editor', this.form.body, b);
      // console.log('>>>', this.form.body, b);
      this.form.body = b;
      console.log('test body watch', this.form.body === b);
      // this.editorLoaded();

      // console.log('in editor body watch...', b === '');
      this.onEditorChange();
    },

    // eslint-disable-next-line func-names
    'form.body': function () {
      // this.onEditorChange();
      // this.editorLoaded();
    },
  },
};
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
  height: 200px; /* Set the height as needed */
  overflow-y: auto; /* Enable vertical scrolling if content overflows */
}
</style>
