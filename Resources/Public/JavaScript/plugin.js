import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { debounce} from 'lodash';

import SnippetPreview from './Components/SnippetPreview';
import Analysis from './Components/Analysis';
import StatusIcon from './Components/StatusIcon';
import TitleProgressBar from './Components/TitleProgressBar';
import DescriptionProgressBar from './Components/DescriptionProgressBar';
import store from './redux/store';
import {getContent, updateContent} from './redux/actions/content';
import {setFocusKeyword} from './redux/actions/focusKeyword';
import RelevantWords from "./Components/RelevantWords";
import {saveRelevantWords} from './redux/actions/relevantWords';

import createAnalysisWorker from './analysis/createAnalysisWorker';
import refreshAnalysis from './analysis/refreshAnalysis';
import {setFocusKeywordSynonyms} from "./redux/actions/focusKeywordSynonyms";

let worker = createAnalysisWorker(YoastConfig.isCornerstoneContent, 'en_US');

store.dispatch(setFocusKeyword(YoastConfig.focusKeyphrase.keyword));
store.dispatch(setFocusKeywordSynonyms(YoastConfig.focusKeyphrase.synonyms));

store
    .dispatch(getContent())
    .then(_ => {
        worker = createAnalysisWorker(YoastConfig.isCornerstoneContent, store.getState().content.locale);
        return refreshAnalysis(worker, store)
    })
    .then(_ => {
        document.querySelectorAll('[data-yoast-analysis]').forEach(container => {
            const config = {};
            config.resultType = container.getAttribute('data-yoast-analysis');

            if (config.resultType === 'seo') {
                config.resultSubtype = container.getAttribute('data-yoast-subtype');
            }

            ReactDOM.render(<Provider store={store}><Analysis {...config} /></Provider>, container);
        });

        store.dispatch(saveRelevantWords(store.getState().relevantWords, YoastConfig.data.uid, YoastConfig.data.languageId, YoastConfig.urls.prominentWords));
    });

document.querySelectorAll('[data-yoast-analysis]').forEach(container => {
    const config = {};
    config.resultType = container.getAttribute('data-yoast-analysis');

    let titleContainer = container.closest('.form-section').querySelector('h4');
    let iconContainer = document.createElement('span');

    if (typeof titleContainer !== "undefined" && titleContainer !== null) {
        iconContainer.classList.add('yoast-seo-status-icon');
        titleContainer.prepend(iconContainer);
    }

    if (config.resultType === 'seo') {
        config.resultSubtype = container.getAttribute('data-yoast-subtype');
    }

    ReactDOM.render(<Provider store={store}><StatusIcon {...config} text="false" /></Provider>, iconContainer);
});

document.querySelectorAll('h1').forEach(container => {
    const configReadability = {};
    const configSeo = {};

    configReadability.resultType = 'readability';
    configSeo.resultType = 'seo';
    configSeo.resultSubtype = '';

    let scoreBar = document.createElement('div');
    scoreBar.classList.add('yoast-seo-score-bar');

    // Readability
    let readabilityContainer = document.createElement('span');
    readabilityContainer.classList.add('yoast-seo-score-bar--analysis');
    scoreBar.append(readabilityContainer);

    // Seo
    let seoContainer = document.createElement('span');
    seoContainer.classList.add('yoast-seo-score-bar--analysis');
    scoreBar.append(seoContainer);

    container.parentNode.insertBefore(scoreBar, container.nextSibling);

    ReactDOM.render(<Provider store={store}><StatusIcon {...configReadability} text="true" /></Provider>, readabilityContainer);
    ReactDOM.render(<Provider store={store}><StatusIcon {...configSeo} text="true" /></Provider>, seoContainer);
});

document.querySelectorAll('[data-yoast-snippetpreview]').forEach(container => {
    ReactDOM.render(<Provider store={store}><SnippetPreview /></Provider>, container);
});

document.querySelectorAll('[data-yoast-insights]').forEach(container => {
    ReactDOM.render(<Provider store={store}><RelevantWords /></Provider>, container);
});

if (typeof $cornerstoneFieldSelector !== 'undefined') {
    document.querySelector('[data-formengine-input-name="' + $cornerstoneFieldSelector + '"]').addEventListener('change', function() {
        worker = createAnalysisWorker(this.checked);
        refreshAnalysis(worker, store);
    });
}

if (typeof YoastConfig.fieldSelectors !== 'undefined' &&
    typeof YoastConfig.fieldSelectors.title !== 'undefined' &&
    typeof YoastConfig.fieldSelectors.description !== 'undefined')
{
    const progressBarItems = [{
        input: document.querySelector(`[data-formengine-input-name="${YoastConfig.fieldSelectors.title}"]`),
        component: <TitleProgressBar/>,
        storeKey: 'title'
    }, {
        input: document.querySelector(`[data-formengine-input-name="${YoastConfig.fieldSelectors.description}"]`),
        component: <DescriptionProgressBar/>,
        storeKey: 'description'
    }]

    progressBarItems.forEach(item => {
        if (item.input) {
            const container = document.createElement('div');
            item.input.after(container);

            item.input.addEventListener('input', debounce(_ => {
                store.dispatch(updateContent({[item.storeKey]: item.input.value}));
            }, 100));

            item.input.addEventListener('change', _ => {
                refreshAnalysis(worker, store);
            })

            ReactDOM.render(<Provider store={store}>{item.component}</Provider>, container);
        }
    });
}
