import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { takeUntil, first } from 'rxjs/operators';
import { Subject } from 'rxjs';

import { AuthenticationService } from 'app/auth/service';
import { CoreConfigService } from '@core/services/config.service';
import { CoreMenuService } from '@core/components/core-menu/core-menu.service';
import { Rol } from 'app/auth/models/rol.model';
import { Recurso } from 'app/auth/models/recurso.model';
import { CoreMenu } from '@core/types';

@Component({
  selector: 'app-auth-login-v2',
  templateUrl: './auth-login-v2.component.html',
  styleUrls: ['./auth-login-v2.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AuthLoginV2Component implements OnInit {
  //  Public
  public coreConfig: any;
  public loginForm: FormGroup;
  public loading = false;
  public submitted = false;
  public returnUrl: string;
  public error = '';
  public passwordTextType: boolean;
  menu: any;
  // Private
  private _unsubscribeAll: Subject<any>;

  // Variables para el captcha
  public captchaText: { text: string; color: string }[];
  public captchaValue: string;
  private captchaUtterance: SpeechSynthesisUtterance; // Declarar una variable para almacenar y controlar la instancia de SpeechSynthesisUtterance 


  /**
   * Constructor
   *
   * @param {CoreConfigService} _coreConfigService
   */
  constructor(
    private _coreConfigService: CoreConfigService,
    private _coreMenuService: CoreMenuService,
    private _formBuilder: FormBuilder,
    private _route: ActivatedRoute,
    private _router: Router,
    private _authenticationService: AuthenticationService
  ) {
    // redirect to home if already logged in
    if (this._authenticationService.currentUserValue) {
      this._router.navigate(['/']);
    }

    this._unsubscribeAll = new Subject();

    // Configure the layout
    this._coreConfigService.config = {
      layout: {
        navbar: {
          hidden: true
        },
        menu: {
          hidden: true
        },
        footer: {
          hidden: true
        },
        customizer: false,
        enableLocalStorage: false
      }
    };

    // <===== Captcha ======>
    this.captchaText = this.generateCaptchaText();
    this.refreshCaptcha();
  }

  // convenience getter for easy access to form fields
  get f() {
    return this.loginForm.controls;
  }

  /**
   * Toggle password
   */
  togglePasswordTextType() {
    this.passwordTextType = !this.passwordTextType;
  }

  onSubmit() {
    this.submitted = true;

    // stop here if form is invalid
    if (this.loginForm.invalid) {
      return;
    }

    // Validar el Captcha
    if (this.captchaValue !== this.loginForm.value.captcha.replace(/\s/g, '')) {
      this.error = 'Captcha incorrecto';
      this.loading = false;
      return;
    }

    // Login
    this.loading = true;
    this._authenticationService
    .login(this.f.usuario.value, this.f.password.value)
    .pipe(first())
    .subscribe(
      data => {
        if (data.accesoConcedido == true) {
          this._authenticationService.obtenerMenu().subscribe(
            menuData => {
              let menuArmar: Rol[] = JSON.parse(localStorage.getItem('menuJson'));
              if (menuArmar != null) {
                this.menu = this.obtenerRoles(menuArmar);
              } else {
                this.menu = null;
              }

              // Register the menu to the menu service
              this._coreMenuService.register('main', this.menu);

              // Set the main menu as our current menu
              this._coreMenuService.setCurrentMenu('main');

              this._router.navigate([this.returnUrl]);
            },
            menuError => {
              this.error = menuError;
              this.loading = false;
            }
          );
        } else {
          this.error = data.observacion;
          this.loading = false;
        }
      },
      error => {
        this.error = error;
        this.loading = false;
      }
    );

  }

  obtenerMenu() {
    this._authenticationService.obtenerMenu().subscribe(
      data => {
        let menuArmar: Rol[] = JSON.parse(localStorage.getItem('menuJson'));
        if (menuArmar != null) {
          this.menu = this.obtenerRoles(menuArmar);
        } else {
          this.menu = null;
        }

        //this.menu = menu;
        this._coreMenuService.unregister('main');
        // Register the menu to the menu service
        this._coreMenuService.register('main', this.menu);

        // Set the main menu as our current menu
        this._coreMenuService.setCurrentMenu('main');
      }
    );
  }
  // Lifecycle Hooks
  // -----------------------------------------------------------------------------------------------------
  obtenerRoles(roles: Rol[]): CoreMenu[] {
    var menuItem: CoreMenu[] = [];
    roles.forEach(rol => {
      var item: CoreMenu =
      {
        id: rol.codigo.toString(),
        type: 'section',
        title: rol.nombre,
      };
      if (rol.menu.length > 0) {
        item.children = this.obtenerRecursos(rol.menu);
      } else {

      }
      menuItem.push(item);
    });
    return menuItem;
  }

  obtenerRecursos(recursos: Recurso[]): CoreMenu[] {
    var menuProceso: CoreMenu[] = [];
    recursos.forEach(hijo => {
      var item: CoreMenu =
      {
        id: hijo.codigo.toString(),
        type: 'collapsible',
        title: hijo.nombre,
        icon: 'file-text',
      };
      if (hijo.recursosHijos.length > 0) {
        item.children = this.obtenerRecursos(hijo.recursosHijos);
      } else {
        item.type = 'item';
        item.url = hijo.url;
        item.icon = 'circle';
      }
      menuProceso.push(item);
    });
    return menuProceso;
  }

  // Inicio captcha

  // Generar el captcha con caracteres alfanuméricos
  generateCaptchaText(): { text: string; color: string }[] {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXZabcdefghijklmnopqrstuvwxz0123456789@$#%+-¿?¡!*/';
    const captchaLength = 6;
    const captchaText: { text: string; color: string }[] = [];
    const colors = ['red', 'blue', 'green', 'purple', 'orange', 'yellow'];

    for (let i = 0; i < captchaLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      const character = characters[randomIndex];
      const colorIndex = Math.floor(Math.random() * colors.length);
      const color = colors[colorIndex];
      captchaText.push({ text: character, color: color });

    }

    // Almacene el valor de captcha para la validación
    this.captchaValue = captchaText.map(item => item.text).join('');

    return captchaText;
  }
  
  refreshCaptcha(): void {
    // Detén la reproducción del audio si está en curso
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    this.captchaText = this.generateCaptchaText();
  }

  // captcha por audio

  // Función para reproducir el captcha por voz
  playCaptchaAudio() {
    // Detener las instancias anteriores
    speechSynthesis.cancel();

    // Obtener el texto actual del captcha
    const captchaText = this.captchaText.map((item) => item.text).join('');

    // Crear la instancia si aún no está creada
    if (!this.captchaUtterance) {
      this.captchaUtterance = new SpeechSynthesisUtterance();
      this.captchaUtterance.lang = 'es-ES'; // Cambiar el código del lenguaje según sea necesario
    }

    // Iniciar la reproducción letra por letra
    this.playNextLetter(captchaText, 0);
  }

  playNextLetter(captchaText: string, index: number) {
    // Si hay más caracteres por reproducir
    if (index < captchaText.length) {
      const currentChar = captchaText.charAt(index);
      let charType = '';
      let charToAnnounce = '';
  
      if (/^[A-Z]$/.test(currentChar)) {
        charToAnnounce = currentChar;
        charType = 'mayúscula';       
      } else if (/^[a-z]$/.test(currentChar)) {       
        charToAnnounce = currentChar;
        charType = 'minúscula';
      } else if (/^[0-9]$/.test(currentChar)) {
        charType = 'número';
        charToAnnounce = currentChar;
      } else {
        // Agregar lógica para anunciar símbolos especiales
        switch (currentChar) {
          case '@':
            charToAnnounce = 'símbolo de arroba';
            break;
          case '$':
            charToAnnounce = 'símbolo de dólar';
            break;
          case '#':
            charToAnnounce = 'símbolo de numeral';
            break;
          case '%':
            charToAnnounce = 'símbolo de porcentaje';
            break;
          case '+':
            charToAnnounce = 'símbolo de más';
            break;
          case '-':
            charToAnnounce = 'símbolo de menos';
            break;
          case '¿':
              charToAnnounce = 'signo de interrogación, inicial';
              break;
          case '?':
              charToAnnounce = 'signo de interrogación, final';
              break;
          case '¡':
              charToAnnounce = 'signo de exclamación, incial';
              break; 
          case '!':
              charToAnnounce = 'signo de exclamación, final';
              break; 
          default:
            charToAnnounce = currentChar;
            break;
        }
      }
  
      // Configurar el texto para anunciar el carácter con su tipo
      this.captchaUtterance.text = `${charType} ${charToAnnounce}`;
  
      // Reproducir el audio
      speechSynthesis.speak(this.captchaUtterance);
  
      // Configurar el evento onend para reproducir el siguiente carácter después de la pausa
      this.captchaUtterance.onend = () => {
        setTimeout(() => {
          this.playNextLetter(captchaText, index + 1);
        }, 300); // Agregar una pausa de 300 ms (ajusta el valor según sea necesario)
      };
    }
  }
  // Fin captcha por audio
  
  // Fin captcha 

  /**
   * On init
   */
  ngOnInit(): void {
    // Get the query params
    this._route.queryParams.subscribe(params => {
      this.returnUrl = params['returnUrl'] || '/';
    });

    this._coreConfigService.config.pipe(takeUntil(this._unsubscribeAll)).subscribe(config => {
      this.coreConfig = config;
    });

    this.loginForm = this._formBuilder.group({
      usuario: ['', Validators.required],
      password: ['', Validators.required],
      captcha: ['', Validators.required]
    });
  }

  /**
   * On destroy
   */
  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next();
    this._unsubscribeAll.complete();
  }
}
