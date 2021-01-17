import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { GameService } from 'src/app/game.service';

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit {
  code:string = ''

  constructor(private activatedRoute:ActivatedRoute, private router:Router, private snackbar:MatSnackBar, private gameSvc:GameService) { }

  ngOnInit(): void {
    this.code = this.activatedRoute.snapshot.params.code
    console.info(this.code)
    if (this.code) {
      if ((/[^a-zA-Z0-9]/.test(this.code)) || this.code.length != 5) {
          this.router.navigate(['/main'])
          this.snackbar.open("Invalid Room code.", "Close", {duration: 4000})
      } else {
        this.gameSvc.onInitSocket(this.code)
        this.gameSvc.createGame()
      }
    }
  }
}
