import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent implements OnInit {
  code:string
  constructor(private router:Router) { }

  ngOnInit(): void {
    this.code = uuidv4().toString().substring(0, 5);
  }

  onSubmit () {
    this.router.navigate(['/game',this.code])
  }

}
