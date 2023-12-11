//import { HomeAssistant } from "./ha-types";
import { html, css, LitElement, CSSResultGroup, TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import { ICardConfig } from "./types";
import styles from './styles'
import { svg } from './img_exp'
import { localize } from './localize/localize';
//import { Moon, Hemisphere } from 'lunarphase-js';
import dayjs from 'dayjs';

import { default as SunCalc } from 'suncalc3';


import {
    HomeAssistant,
    hasConfigOrEntityChanged,
    hasAction,
    ActionHandlerEvent,
    handleAction,
    LovelaceCardEditor,
    getLovelace,
    formatTime
  } from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers
  
import type { HassEntity } from "home-assistant-js-websocket";


const TSMOON_PHASES = {
    newMoon: 'new_moon',
    waxingCrescentMoon: 'waxing_crescent',
    firstQuarterMoon: 'first_quarter',
    waxingGibbousMoon: 'waxing_gibbous',
    fullMoon: 'full_moon',
    waningGibbousMoon: 'waning_gibbous',
    thirdQuarterMoon: 'last_quarter',
    waningCrescentMoon: 'waning_crescent'
};


/**
 * Main card class definition
 */
export class TSMoonCard extends LitElement {

    @property({ attribute: false })
    private cardTitle: string = "";

    @property({ attribute: false })
    private state: string = "";

    @property({ attribute: false })
    private icon_type: string = "forms";

    @property({ attribute: false })
    private language: string = "en";

    @property({ attribute: false })
    private entity: string = "";

    @property({ attribute: false }) private home_latitude: number = 0;
    @property({ attribute: false }) private home_longitude: number = 0;

    @state() private _config?: ICardConfig


    private renderIcon (svg_icon_code: string): TemplateResult {
        return html`
            <div class="icon">
                <img class="moon-img-svg" src=${svg_icon_code} />
            </div>
        `
    }

    private localize (key: string): string {
        return localize(key, this.getLocale())
    }

    private getLocale (): string {
        return this.language ?? this.hass.locale.language ?? 'en'
    }

    private toIcon(moonState: string, type: string): string {
        if ((type === 'forms') || (type === 'round') || (type === 'photo') || (type === 'clear')) {
            return svg[type][moonState]!;
        } else {
          // Gérer le cas où la propriété n'est pas définie
          // throw new Error('Propriété non définie');
          return "";
        }
      }

    // CSS for the card
    // https://lit.dev/docs/components/styles/
    static get styles (): CSSResultGroup {
        return styles
    }
    /**
     * Called on every hass update
     */
    set hass(hass: HomeAssistant) {
        
        if (!this.entity || !hass.states[this.entity]) {
            return;
        }

        this.state = hass.states[this.entity].state;
        this.home_latitude = hass.states['zone.home'].attributes.latitude;
        this.home_longitude = hass.states['zone.home'].attributes.longitude;
    }

    /**
     * Called every time when entity config is updated
     * @param config Card configuration (yaml converted to JSON)
     */
    setConfig(config: ICardConfig): void {
        
        this._config = {...config};

        this.entity = config.entity ?? this.entity;
        this.cardTitle = config.title ?? this.cardTitle;
        this.icon_type = config.icon_type ?? 'forms';
        this.language = config.language ?? 'fr';
    /*
        if (config.latitude === undefined && config.longitude !== undefined
            || config.latitude !== undefined && config.longitude == undefined) {
            throw Error('Latitude and longitude must be both set or unset')
          }
    */

    }

    /**
     * Renders the card when the update is requested (when any of the properties are changed)
     */
    render(): TemplateResult {

        var lv_state = this.state; 
        const lc_date = new Date();  // Def Date

        if (! lv_state) {
            
            //Calcul autonome de la phase de la lune
            const lc_moonRawData = SunCalc.getMoonData(lc_date, this.home_latitude, this.home_longitude);       
             
            // suncalc ne donne pas les mêmes chaines de varible retour des phases
            // donc il faut les traduire
            const lc_state3 = TSMOON_PHASES[lc_moonRawData.illumination.phase.id];
            lv_state = this.localize(`moon.${lc_state3}`);

        } 

        // A partir d'ici lv_state est OK

        // Calcul de l'icone
        const lc_moonIcon = this.toIcon(lv_state, this.icon_type);
        const lc_state_localized = this.localize(`moon.${lv_state}`);
        
        // Calcul des temps du lever et du coucher du soleil
        const lc_times = SunCalc.getMoonTimes(lc_date, this.home_latitude, this.home_longitude);
        
        // Accéder directement aux propriétés spécifiques pour obtenir les heures
        //const l_moonrise = lc_times.rise;
        //const l_moonset = lc_times.set;

        // Convertir la date en utilisant Day.js
        const lc_moonriseFormated = dayjs(lc_times.rise).format('HH:mm');
        const lc_moonsetFormated = dayjs(lc_times.set).format('HH:mm');

   
       
        return html`
        
        <ha-card>
            <div class="card-header">
                <div class="truncate">
                    ${this.cardTitle}
                </div>
            </div>
            <div class="card-content">
                <div class="entity-row">
                    ${this.renderIcon(lc_moonIcon)}
                    <div class="info">
                    <span class="primary">${this.localize(`card.moon_phase`)}</span>
                        <div class="secondary">
                        ${lc_state_localized}
                        </div>
                    </div>
                    <div class="state">
                    <span class="primary">${this.localize(`card.moon_rise`)}: </span> ${lc_moonriseFormated}<br />
                    <span class="primary">${this.localize(`card.moon_set`)}: </span> ${lc_moonsetFormated}
                    </div>
                </div>
            </div>
        </ha-card>
        `;
    }


}