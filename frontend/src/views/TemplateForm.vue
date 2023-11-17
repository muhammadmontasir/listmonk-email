<template>
  <section>
    <header class="modal-card-head">
      <b-button
        @click="previewTemplate"
        class="is-pulled-right"
        type="is-primary"
        icon-left="file-find-outline"
        style="margin-top: -10px;"
        >{{ $t("templates.preview") }}</b-button
      >

      <template v-if="isEditing">
        <h4>{{ data.name }}</h4>
        <p class="has-text-grey is-size-7">
          {{ $t("globals.fields.id") }}: <span data-cy="id">{{ data.id }}</span>
        </p>
      </template>
      <h4 v-else>{{ $t("templates.newTemplate") }}</h4>
    </header>
      <div style="padding: 14px;">
        <form @submit.prevent="onSubmit">
          <section>
            <div class="columns">
              <div class="column is-9">
                <b-field :label="$t('globals.fields.name')" label-position="on-border">
                  <b-input
                    :maxlength="200"
                    :ref="'focus'"
                    v-model="form.name"
                    name="name"
                    :placeholder="$t('globals.fields.name')"
                    required
                  />
                </b-field>
              </div>
              <div class="column is-3">
                <b-field :label="$t('globals.fields.type')" label-position="on-border">
                  <b-select v-model="form.type" :disabled="isEditing" expanded>
                    <option value="campaign">{{ $tc("globals.terms.campaign") }}</option>
                    <option value="tx">{{ $tc("globals.terms.tx") }}</option>
                  </b-select>
                </b-field>
              </div>
            </div>
            <div class="columns" v-if="form.type === 'tx'">
              <div class="column is-12">
                <b-field :label="$t('templates.subject')" label-position="on-border">
                  <b-input
                    :maxlength="200"
                    :ref="'focus'"
                    v-model="form.subject"
                    name="name"
                    :placeholder="$t('templates.subject')"
                    required
                  />
                </b-field>
              </div>
            </div>
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

            <p class="is-size-7">
              <template v-if="form.type === 'campaign'">
                {{ $t("templates.placeholderHelp", { placeholder: egPlaceholder }) }}
              </template>
              <a target="_blank" href="https://listmonk.app/docs/templating">
                {{ $t("globals.buttons.learnMore") }}
              </a>
            </p>
          </section>
          <footer class="modal-card-foot has-text-right">
            <b-button @click="$parent.close(); onSubmit()">{{ $t("globals.buttons.close") }}</b-button>
            <b-button native-type="submit" type="is-primary" :loading="loading.templates">{{
              $t("globals.buttons.save")
            }}</b-button>
          </footer>
      </form>
    </div>
    <campaign-preview
      v-if="previewItem"
      type="template"
      :title="previewItem.name"
      :templateType="previewItem.type"
      :body="form.body"
      @close="closePreview"
    ></campaign-preview>
  </section>
</template>

<script>
import Vue from "vue";
import { mapState } from "vuex";
import CampaignPreview from "../components/CampaignPreview.vue";
import { EmailEditor } from "vue-email-editor";
import sample from "../emailData/mailTemplateContent.json";

export default Vue.extend({
  components: {
    CampaignPreview,
    EmailEditor,
  },

  props: {
    data: Object,
    isEditing: null,
  },

  data() {
    return {
      activeTab: "builder",
      form: {
        name: "",
        subject: "",
        type: "campaign",
        optin: "",
        body: null,
      },
      previewItem: null,
      egPlaceholder: '{{ template "content" . }}',
      minHeight: "1000px",
      locale: "en",
      projectId: 0,
      tools: {
        image: {
          enabled: true,
        },
      },
      options: {},
      appearance: {
        theme: "light",
        panels: {
          tools: {
            dock: "left",
          },
        },
      },
    };
  },

  methods: {
    editorLoaded() {
      console.log("editorLoaded");
      this.$refs.emailEditor.editor.loadDesign(sample);
    },
    // called when the editor has finished loading
    editorReady() {
      console.log("editorReady");
    },

    saveDesign() {
      this.$refs.emailEditor.editor.saveDesign((design) => {
        console.log("saveDesign", design);
      });
    },

    async exportHtml() {
      return new Promise((resolve, reject) => {
        this.$refs.emailEditor.editor.exportHtml((data) => {
          // console.log("exportHtml", data);
          console.log("exportHtml", data.design);
          this.form.body = data.html;
          resolve();
        });
      });
    },

    async previewTemplate() {
      await this.exportHtml();

      this.previewItem = this.form;
    },

    closePreview() {
      this.previewItem = null;
    },

    async onSubmit() {
      await this.exportHtml();

      if (this.isEditing) {
        this.updateTemplate();
        return;
      }

      this.createTemplate();
    },

    createTemplate() {
      const data = {
        id: this.data.id,
        name: this.form.name,
        type: this.form.type,
        subject: this.form.subject,
        body: this.form.body,
      };

      this.$api.createTemplate(data).then((d) => {
        this.$emit("finished");
        this.$parent.close();
        this.$utils.toast(this.$t("globals.messages.created", { name: d.name }));
      });
    },

    updateTemplate() {
      const data = {
        id: this.data.id,
        name: this.form.name,
        type: this.form.type,
        subject: this.form.subject,
        body: this.form.body,
      };

      this.$api.updateTemplate(data).then((d) => {
        this.$emit("finished");
        this.$parent.close();
        this.$utils.toast(`'${d.name}' updated`);
      });
    },    
  },

  computed: {
    ...mapState(["loading"]),
  },

  mounted() {
    this.form = { ...this.$props.data };

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
  height: 200px; /* Set the height as needed */
  overflow-y: auto; /* Enable vertical scrolling if content overflows */
}

#example {
  height: 100%;
}

#example .container {
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
}

#bar {
  flex: 1;
  background-color: #0055d4;
  color: #fff;
  padding: 10px;
  display: flex;
  max-height: 40px;
}

#bar h1 {
  flex: 1;
  font-size: 16px;
  text-align: left;
}

#bar button {
  flex: 1;
  padding: 4px;
  margin-left: 10px;
  font-size: 14px;
  font-weight: bold;
  background-color: hsl(0, 0%, 86%);
  color: hsl(0, 0%, 4%);
  border: 0px;
  max-width: 150px;
  cursor: pointer;
  height: 28px;
}
</style>
