class Sequence {

    #loadedFrames = 0; // Количество загруженных фреймов

    #fpsInterval = null;
    #now = null;
    #then = null;
    #startTime = null;
    #elapsed = null;
    requestId = null;

    constructor(settings) {

        // Required
        this.canvas = document.querySelector(settings.canvas);
        this.pathToFrames = settings.pathToFrames;
        this.countFrames = settings.countFrames;
        this.formatFrames = settings.formatFrames;
        this.nameFrames = settings.nameFrames;
        this.padFrames = settings.padFrames;
        this.widthFrames = settings.widthFrames;
        this.heightFrames = settings.heightFrames;

        // Optional
        this.prevent = settings.prevent === true;
        this.widthCavnas = this.widthFrames; // Ширина полотна
        this.heightCavnas = this.heightFrames; // Высота полотна
        this.direction = settings.direction || 1; // Направление (1, -1)
        this.fps = settings.fps || 0; // Частота кадров в секунду
        this.loop = settings.loop || false; // Повтор
        this.reversible = settings.reversible || false; // Реверсивный
        this.renderFirstFrame = settings.renderFirstFrame || false; // Показывать ли сразу первый фрейм
        this.startAfterLoading = settings.startAfterLoading || false; // Запускать рендер после загрузки всех фреймов

        this.resize = settings.resize || undefined;

        // Engine
        this.context = this.canvas.getContext('2d');
        this.frames = []; // Все фреймы
        this.currentFrame = settings.direction && settings.direction < 0 ? settings.countFrames - 1 : 0; // Текущий фрейм
        this.events = settings.on || {};



        // Start init
        if (!this.prevent) this.init();
    }

    init = () => {
        this.#addCustomListeners();
        this.#engine();
        this.setSizeCanvas(this.widthCavnas, this.heightCavnas);
        this.loadFrames();
    }

    loadFrames = () => {
        const load = (i) => {
            const img = new Image();
            img.src = this.#getPathFrameForDownload(i);
            img.onload = () => {
                this.frames[i] = img;
                this.#loadedFrames++;
                this.dispatch('loading');

                if (i === 0) {
                    this.dispatch('firstLoaded');
                }
                if (this.#loadedFrames === this.countFrames) {
                    this.dispatch('loaded');
                }
            };
            img.onerror = () => {
                this.dispatch('errorLoad');
            };
        }
        if (this.countFrames) {
            if (this.direction > 0) {
                for (let i = 0; i < this.countFrames; i++) {
                    load(i);

                }
            } else {
                for (let i = this.countFrames - 1; i >= 0; i--) {
                    load(i);
                }
            }

        }
    }

    #getPathFrameForDownload = indexFrame => this.pathToFrames + this.nameFrames + indexFrame.toString().padStart(this.padFrames, '0') + '.' + this.formatFrames;

    #engine = () => {

        if (this.renderFirstFrame) {
            // При загрузке первого фрейма
            this.canvas.addEventListener('firstLoaded', () => {
                this.drawFrame(this.currentFrame);
            });
        }

        // При загрузке каждого фрейма
        this.canvas.addEventListener('loading', () => {
            // console.log('Загрузился фрейм', this.getLoadingPercent() + '%');
        });

        // При завершении загрузки фреймов
        this.canvas.addEventListener('loaded', () => {
            if (this.startAfterLoading) {
                this.play();
            }
        });

        // При ошибки загрузки фрейма
        this.canvas.addEventListener('errorLoad', () => {
            console.error('Ошибка загрузки фрейма');
        });
    }

    // Рендер кадра
    drawFrame = (indexFrame) => {
        if (indexFrame !== undefined) {
            this.context.clearRect(0, 0, this.widthCavnas, this.heightCavnas);
            if (this.resize) {
                this.context.drawImage(this.frames[indexFrame], this.resize.sX, this.resize.sY, this.resize.sWidth, this.resize.sHeight, this.resize.x, this.resize.y, this.resize.width, this.resize.height);
            } else {
                this.context.drawImage(this.frames[indexFrame], 0, 0, this.widthFrames, this.heightFrames, 0, 0, this.widthCavnas, this.heightCavnas);
            }
            this.dispatch('update');
        }
    }

    // Рендер
    #render = () => {
        if (this.fps > 0) {
            this.#now = Date.now();
            this.#elapsed = this.#now - this.#then;
            if (this.#elapsed > this.#fpsInterval) {
                this.#then = this.#now - (this.#elapsed % this.#fpsInterval);
                this.#logicRender();
            }
        } else {
            this.#logicRender();
        }
        this.requestId = window.requestAnimationFrame(this.#render);
    }

    // Логика смены слайдов
    #logicRender = () => {
        if (this.direction > 0) { // Направление вперед
            if (this.loop) { // Зацикленность?
                if (this.reversible) { // Изменение направления?
                    if (this.currentFrame + 1 < this.countFrames) { // Вперед
                        this.currentFrame = this.currentFrame + 1;
                    } else { // Меняем направление
                        this.direction = -1;
                        this.dispatch('reversible');
                        this.currentFrame = this.currentFrame - 1;
                    }
                } else { // Возвращаемся к 0-му фрейму
                    if (this.currentFrame + 1 < this.countFrames) {
                        this.currentFrame = this.currentFrame + 1;
                    } else {
                        this.currentFrame = 0;
                        this.dispatch('looped');
                    }
                }
            } else { // Нет цикличности
                if (this.currentFrame + 1 < this.countFrames) { // Вперед
                    this.currentFrame = this.currentFrame + 1;
                } else { // Приостанавливаем
                    this.pause();
                }
            }
        } else { // Направление назад
            if (this.loop) { // Зацикленность?
                if (this.reversible) { // Изменение направления?
                    if (this.currentFrame - 1 >= 0) { // Назад
                        this.currentFrame = this.currentFrame - 1
                    } else { // Меняем направление
                        this.direction = 1;
                        this.dispatch('reversible');
                        this.currentFrame = this.currentFrame + 1;
                    }
                } else { // Переходим к последнему фрейму
                    if (this.currentFrame - 1 >= 0) {
                        this.currentFrame = this.currentFrame - 1;
                    } else {
                        this.currentFrame = this.countFrames - 1;
                        this.dispatch('looped');
                    }
                }
            } else { // Нет цикличности
                if (this.currentFrame - 1 >= 0) { // Назад
                    this.currentFrame = this.currentFrame - 1;
                } else { // Приостановили
                    this.pause();
                }
            }
        }
        this.drawFrame(this.currentFrame);
    }

    // Старт
    play = () => {
        if (this.fps > 0) {
            this.#fpsInterval = 1000 / this.fps;
            this.#then = Date.now();
            this.#startTime = this.#then;
        }
        this.#logicRender();
        this.#render();
    }

    // Пауза
    pause = () => {
        window.cancelAnimationFrame(this.requestId);
    }

    // Вызов событий
    dispatch = (event) => {
        switch (event) {
            case 'firstLoaded':
                this.canvas.dispatchEvent(new CustomEvent('firstLoaded', {
                    bubbles: true,
                    detail: {}
                }));
                break;
            case 'loaded':
                this.canvas.dispatchEvent(new CustomEvent('loaded', {
                    bubbles: true,
                    detail: {}
                }));
                break;
            case 'loading':
                this.canvas.dispatchEvent(new CustomEvent('loading', {
                    bubbles: true,
                    detail: {}
                }));
                break;
            case 'errorLoad':
                this.canvas.dispatchEvent(new CustomEvent('errorLoad', {
                    bubbles: true,
                    detail: {}
                }));
                break;
            case 'reversible':
                this.canvas.dispatchEvent(new CustomEvent('reversible', {
                    bubbles: true,
                    detail: {}
                }));
                break;
            case 'looped':
                this.canvas.dispatchEvent(new CustomEvent('looped', {
                    bubbles: true,
                    detail: {}
                }));
                break;
            case 'update':
                this.canvas.dispatchEvent(new CustomEvent('update', {
                    bubbles: true,
                    detail: {}
                }));
                break;
            default:
                console.error(`События "${event}" не существует.`);
        }
    }

    // При инициализации можем повесить события
    #addCustomListeners = () => {
        if (this.events) {
            for (let key in this.events) {
                this.canvas.addEventListener(key, this.events[key].bind(this));
            }
        }
    }

    // После инициализации можем повесить события
    on = (method, callback) => {
        this.canvas.addEventListener(method, callback.bind(this));
    }


    // Размеры полотна
    setSizeCanvas = (width, height) => {
        this.canvas.width = width;
        this.canvas.height = height;
    }
    getSizeCanvas = () => { return { width: this.widthCavnas, height: this.heightCavnas } }

    // Размеры фреймов
    setSizeFrames = (width, height) => {
        this.widthFrames = width;
        this.heightFrames = height;
    }
    getSizeFrames = () => { return { width: this.widthFrames, height: this.heightFrames } }

    // Направление
    setDirection = direction => {
        this.direction = direction
    }
    getDirection = () => this.direction;

    // Загрузка фреймов
    getPercentLoading = () => {
        return this.#loadedFrames ? Math.floor(this.#loadedFrames / (this.countFrames / 100)) : 0;
    }
    getCoungLoading = () => this.#loadedFrames;

    // Текущий фрейм
    setCurrentFrame = (indexFrame) => {
        this.currentFrame = indexFrame;
    }
    getCurrentFrame = () => this.currentFrame;
}