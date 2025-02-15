import { mapState } from 'vuex';
import template from './sw-plugin-list.html.twig';
import './sw-plugin-list.scss';

const { Component, Mixin, State } = Shopware;
const { Criteria } = Shopware.Data;

const cacheApiService = Shopware.Service('cacheApiService');
const pluginService = Shopware.Service('pluginService');
const systemConfigApiService = Shopware.Service('systemConfigApiService');

Component.register('sw-plugin-list', {
    template,

    props: {
        searchTerm: {
            type: String,
            required: false
        },

        pageLoading: {
            type: Boolean,
            required: false,
            default: false
        }
    },

    inject: [
        'licenseViolationService'
    ],

    mixins: [
        Mixin.getByName('listing'),
        Mixin.getByName('notification')
    ],

    data() {
        return {
            isLoading: false,
            sortBy: 'upgradedAt',
            sortDirection: 'desc',
            sortType: 'upgradedAt:desc',
            showDeleteModal: false
        };
    },

    computed: {
        ...mapState('licenseViolation', [
            'violations',
            'warnings',
            'other'
        ]),

        pluginRepository() {
            return Shopware.Service('repositoryFactory').create('plugin');
        },

        pluginCriteria() {
            const criteria = new Criteria(this.page, this.limit);
            criteria.addSorting(Criteria.sort(this.sortBy, this.sortDirection));
            if (this.searchTerm) {
                criteria.setTerm(this.searchTerm);
            }

            return criteria;
        },

        searchData() {
            return {
                repository: this.pluginRepository,
                criteria: this.pluginCriteria,
                context: this.apiContext
            };
        },

        apiContext() {
            return {
                ...Shopware.Context.api,
                languageId: this.languageId
            };
        },

        plugins() {
            return State.get('swPlugin').plugins;
        },

        totalPlugins() {
            return State.get('swPlugin').totalPlugins;
        },

        currentLocale() {
            return Shopware.State.get('adminLocale').currentLocale;
        },

        languageId() {
            return Shopware.State.get('adminLocale').languageId;
        },

        sorting: {
            get() {
                return `${this.sortBy}:${this.sortDirection}`;
            },
            set(sorting) {
                [this.sortBy, this.sortDirection] = sorting.split(':');
            }
        },

        sortOptions() {
            return [
                {
                    label: this.$tc('sw-plugin.list.sortUpgradedAtAsc'),
                    value: 'upgradedAt:desc'
                }, {
                    label: this.$tc('sw-plugin.list.sortPluginNameAsc'),
                    value: 'label:asc'
                }, {
                    label: this.$tc('sw-plugin.list.sortPluginNameDsc'),
                    value: 'label:desc'
                }
            ];
        },

        pluginColumns() {
            return [{
                property: 'label',
                dataProperty: 'label',
                primary: true,
                label: this.$tc('sw-plugin.list.columnPluginName')
            }, {
                property: 'active',
                label: this.$tc('sw-plugin.list.columnActive')
            }, {
                property: 'version',
                label: this.$tc('sw-plugin.list.columnVersion')
            }];
        }
    },

    watch: {
        searchTerm() {
            this.onSearch(this.searchTerm);
        },

        plugins() {
            return this.isConfigAvailableForPlugins();
        }
    },

    methods: {
        changeActiveState(plugin, newActiveState) {
            this.isLoading = true;

            if (newActiveState) {
                return this.activatePlugin(plugin);
            }

            return this.deactivatePlugin(plugin);
        },

        activatePlugin(plugin) {
            this.isLoading = true;

            return pluginService.activate(plugin.name).then(() => {
                this.createNotificationSuccess({
                    title: this.$tc('sw-plugin.list.titleActivateSuccess'),
                    message: this.$tc('sw-plugin.list.messageActivateSuccess')
                });
            }).then(() => {
                return this.clearCacheAndReloadPage();
            }).catch((e) => {
                this.isLoading = false;

                throw e;
            });
        },

        deactivatePlugin(plugin) {
            this.isLoading = true;

            return pluginService.deactivate(plugin.name).then(() => {
                this.createNotificationSuccess({
                    title: this.$tc('sw-plugin.list.titleDeactivateSuccess'),
                    message: this.$tc('sw-plugin.list.messageDeactivateSuccess')
                });
            }).then(() => {
                return this.clearCacheAndReloadPage();
            }).catch((e) => {
                this.isLoading = false;

                throw e;
            });
        },

        onInstallPlugin(plugin) {
            this.isLoading = true;

            pluginService.install(plugin.name).then(() => {
                this.createNotificationSuccess({
                    title: this.$tc('sw-plugin.list.titleInstallSuccess'),
                    message: this.$tc('sw-plugin.list.messageInstallSuccess')
                });
            }).then(() => {
                return this.getList();
            }).catch((e) => {
                this.isLoading = false;

                throw e;
            });
        },

        onUninstallPlugin(plugin) {
            this.isLoading = true;

            pluginService.uninstall(plugin.name).then(() => {
                this.createNotificationSuccess({
                    title: this.$tc('sw-plugin.list.titleUninstallSuccess'),
                    message: this.$tc('sw-plugin.list.messageUninstallSuccess')
                });

                if (plugin.active === true) {
                    return this.clearCacheAndReloadPage();
                }

                return this.getList();
            }).catch((e) => {
                this.isLoading = false;

                throw e;
            });
        },

        onUpdatePlugin(plugin) {
            this.isLoading = true;
            return pluginService.update(plugin.name).then(() => {
                this.createNotificationSuccess({
                    title: this.$tc('sw-plugin.list.titleUpdateSuccess'),
                    message: this.$tc('sw-plugin.list.messageUpdateSuccess')
                });
            }).then(() => {
                return this.clearCacheAndReloadPage();
            }).catch((e) => {
                this.isLoading = false;

                throw e;
            });
        },

        onDeletePlugin(plugin) {
            this.showDeleteModal = plugin.id;
        },

        onConfirmDelete(plugin) {
            this.isLoading = true;
            pluginService.delete(plugin.name).then(() => {
                this.createNotificationSuccess({
                    title: this.$tc('sw-plugin.list.titleDeleteSuccess'),
                    message: this.$tc('sw-plugin.list.messageDeleteSuccess')
                });
                this.showDeleteModal = false;
            }).then(() => {
                this.clearCacheAndReloadPage();
            }).catch((e) => {
                this.isLoading = false;

                throw e;
            });
        },

        onCloseDeleteModal() {
            this.showDeleteModal = false;
        },

        onPluginSettings(plugin) {
            this.$router.push({ name: 'sw.plugin.settings', params: { namespace: plugin.name } });
        },

        getList() {
            this.isLoading = true;

            return State.dispatch('swPlugin/updatePluginList', this.searchData)
                .finally(() => {
                    this.isLoading = false;
                });
        },

        sortPluginList(sorting) {
            this.sorting = sorting;
            this.page = 1;

            this.updateRoute({
                sortBy: this.sortBy,
                sortDirection: this.sortDirection,
                page: this.page
            });
        },

        isConfigAvailableForPlugins() {
            this.isLoading = true;

            return Promise.all(this.plugins.map((plugin) => {
                if (!plugin.active) {
                    plugin.customFields = {
                        configAvailable: false
                    };

                    return Promise.resolve();
                }

                return systemConfigApiService.checkConfig(`${plugin.name}.config`).then((response) => {
                    plugin.customFields = {
                        configAvailable: response
                    };
                }).catch(() => {
                    plugin.customFields = {
                        configAvailable: false
                    };
                });
            })).finally(() => {
                this.isLoading = false;
            });
        },

        getLicenseInformationForPlugin(plugin) {
            const matches = [
                ...this.violations.filter((violation) => violation.name === plugin.name),
                ...this.warnings.filter((warning) => warning.name === plugin.name),
                ...this.other.filter((other) => other.name === plugin.name)
            ];

            return matches.map((match) => {
                const violation = match.extensions.licenseViolation;

                return {
                    level: violation.type.level,
                    label: violation.type.label,
                    text: violation.text,
                    actions: violation.actions
                };
            });
        },

        clearCacheAndReloadPage() {
            return cacheApiService.clear()
                .then(() => {
                    window.location.reload();
                });
        }
    }
});
