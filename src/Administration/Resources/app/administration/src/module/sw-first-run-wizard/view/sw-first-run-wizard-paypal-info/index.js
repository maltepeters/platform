import template from './sw-first-run-wizard-paypal-info.html.twig';
import './sw-first-run-wizard-paypal-info.scss';

const { Component } = Shopware;

Component.register('sw-first-run-wizard-paypal-info', {
    template,

    inject: ['storeService', 'pluginService'],

    data() {
        return {
            isInstallingPlugin: false,
            pluginInstallationFailed: false,
            pluginName: 'SwagPayPal',
            installPromise: Promise.resolve()
        };
    },

    created() {
        this.createdComponent();
    },

    methods: {
        createdComponent() {
            this.updateButtons();
            this.setTitle();
            this.installPromise = this.installPayPal();
        },

        setTitle() {
            this.$emit('frw-set-title', this.$tc('sw-first-run-wizard.paypalInfo.modalTitle'));
        },

        updateButtons() {
            const buttonConfig = [
                {
                    key: 'back',
                    label: this.$tc('sw-first-run-wizard.general.buttonBack'),
                    position: 'left',
                    variant: null,
                    action: 'sw.first.run.wizard.index.mailer.selection',
                    disabled: false
                },
                {
                    key: 'skip',
                    label: this.$tc('sw-first-run-wizard.general.buttonSkip'),
                    position: 'right',
                    variant: null,
                    action: 'sw.first.run.wizard.index.plugins',
                    disabled: false
                },
                {
                    key: 'configure',
                    label: this.$tc('sw-first-run-wizard.general.buttonNextPayPalInfo'),
                    position: 'right',
                    variant: 'primary',
                    action: this.activatePayPalAndRedirect.bind(this),
                    disabled: false
                }
            ];

            this.$emit('buttons-update', buttonConfig);
        },

        installPayPal() {
            return this.storeService.downloadPlugin(this.pluginName, true)
                .then(() => {
                    return this.pluginService.install(this.pluginName);
                });
        },

        activatePayPalAndRedirect() {
            this.isInstallingPlugin = true;
            this.installPromise.then(() => {
                return this.pluginService.activate(this.pluginName);
            }).then(() => {
                // need a force reload, after plugin was activated
                const { origin, pathname } = document.location;
                const url = `${origin}${pathname}/#/sw/first/run/wizard/index/paypal/credentials`;

                document.location.href = url;

                return Promise.resolve(true);
            }).catch(() => {
                this.isInstallingPlugin = false;
                this.pluginInstallationFailed = true;

                return true;
            });
        }
    }
});
